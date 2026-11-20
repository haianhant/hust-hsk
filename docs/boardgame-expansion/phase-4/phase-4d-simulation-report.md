# Bóng Đêm KTX — Phase 4D 15,000-Match Simulation & Balance Report (`starter-twenty-six`)

> **Nguồn dữ liệu:** Chạy thực tế `node scripts/sim-starter-twenty-six.cjs --write-json` (**15,000 trận deterministic**: 3,000 trận × 5 quy mô `4P–8P`, bộ seed `8,000,000 + playerCount×100,000 + g + 1`, skill-aware bots bao phủ đủ **36 vai trò** và **15 loại Pending Choice**; dữ liệu thô tại [`starter-twenty-six-sim-data.json`](./starter-twenty-six-sim-data.json)), đối chiếu xuyên suốt với `starter-sixteen` (`10,000` trận, [`starter-sixteen-sim-data.json`](../phase-3/starter-sixteen-sim-data.json)), `starter-eight` (`10,000` trận, [`starter-eight-sim-data.json`](../phase-2/starter-eight-sim-data.json)) và `classic` (`4,500` trận, `node test/boardgame-sim.cjs`).
> **Nguyên tắc cân bằng:** Không tự ý thay đổi HP hay kỹ năng nhân vật dựa trên riêng bot simulation. Toàn bộ phát hiện được tách rõ giữa **hành vi bot-meta** và **giả thuyết cần kiểm chứng bằng Human Playtest**.

---

## 1. Tổng quan Hiệu năng, Nhịp Trận & Độ Ổn định (`classic` → `starter-eight` → `starter-sixteen` → `starter-twenty-six`)

| Chỉ số | Classic (4,500) | Starter Eight (10,000) | Starter Sixteen (10,000) | **Starter Twenty-Six (15,000)** | Delta (S26 vs S16) | Đánh giá |
|---|---:|---:|---:|---:|---:|---|
| **Pool nhân vật khả dụng** | 10 (3H/3S/4N) | 18 (7H/7S/4N) | 26 (10H/10S/6N) | **36 (14H/14S/8N)** | `+10` | ✅ Cân xứng 3 phe |
| **Tổng trận hoàn tất** | 4,500 / 4,500 | 10,000 / 10,000 | 10,000 / 10,000 | **15,000 / 15,000** | `+5,000` | ✅ 100% hoàn tất (`43.21s`) |
| **Trận bị treo (`stalledGames`)** | 0 | 0 | 0 | **0** | `0` | ✅ 0 deadlock |
| **Trận hòa (`draws`)** | 0 | 0 | 0 | **0** | `0` | ✅ 0 draw |
| **Vi phạm P0 (`botAccessViolations`)** | 0 | 0 | 0 | **0** | `0` | ✅ Zero secret leak |
| **Số vòng TB (`avgRounds`)** | `7.34` | `8.31` | `8.06` | **`7.67`** | `-0.39` | ✅ Rất sát nhịp Classic (`7.34`) |
| **Số lượt TB (`avgTurns`)** | `32.36` | `36.01` | `35.42` | **`33.81`** | `-1.61` | ✅ Nhanh gọn, không kéo dài trận |
| **Chạm trần vòng (`reachedMaxRoundPct`)** | — | `0.63%` | `0.59%` | **`0.38%`** | `-0.21%` | ✅ Giảm thấp nhất toàn lịch sử |
| **Kết thúc sớm V1–V2 (`earlyEndRounds1To2Pct`)** | `2.02%` | `1.82%` | `1.59%` | **`2.49%`** | `+0.90%` | ✅ An toàn (`< 5%`, tăng nhẹ do Cruz/Wrath) |
| **Tỷ lệ chết V1 / ghế (`round1PlayerDeathRatePct`)** | `0.448%` | `0.560%` | `0.430%` | **`0.482%`** | `+0.052%` | ✅ Sát Classic (`0.448%`) |
| **Hạ gục TB / trận (`avgEliminationsPerGame`)** | `3.21` | `3.25` | `3.19` | **`3.18`** | `-0.01` | ✅ Ổn định tuyệt đối |
| **Tổng sát thương TB / trận** | — | `68.75` | `67.89` | **`65.84`** | `-2.05` | ✅ Không phình sát thương tổng |
| **Tổng Pending Choices (`totalPendingChoicesResolved`)** | `0` | `43,547` (6 loại) | `39,533` (9 loại) | **`69,211` (15 loại)** | `+29,678` | ✅ Khớp 100% tổng lập trình từ JSON |

### 1.1. Đối chiếu Chương trình Toàn bộ 15 Loại Pending Choices (`totalPendingChoicesResolved = 69,211`) & Địa điểm

| Pending Choice Kind | Đợt | Lượt xử lý | Địa điểm KTX (Location Alias) | Tỷ lệ lượt đứng |
|---|---|---:|---|---:|
| `fea_move_adjust` | **Wave 3** | **10,345** | `breaker` (4–5) | `25.11%` |
| `felicia_draw_choice` | Wave 1 | **9,431** | `lobby` (`Church` · 6) | `19.30%` |
| `wrath_turn_start_aoe` | **Wave 3** | **7,337** | `corridor` (`Weird Woods` · 9) | `17.63%` |
| `gayle_attack_reroll` | Wave 1 | **7,189** | `radio` (2–3) | `15.59%` |
| `fiona_attack_roll` | Wave 1 | **6,415** | `canteen` (8) | `14.48%` |
| `cruz_black_redraw` | **Wave 3** | **6,100** | `court` (`Erstwhile Altar` · 10) | `7.88%` |
| `victor_blood_boost` | Wave 1 | **5,139** | — | — |
| `bipolar_fate_coin` | Wave 2 | **3,319** | — | — |
| `cindy_reveal_retaliate` *(Secret)* | Wave 2 | **3,009** | — | — |
| `elysia_counter_boost` | Wave 2 | **2,428** | — | — |
| `visions_mark_target` | **Wave 3** | **2,254** | — | — |
| `undying_reveal_reduce` *(Secret)* | Wave 1 | **2,235** | — | — |
| `wendigo_reveal_heal` *(Secret)* | Wave 1 | **2,081** | — | — |
| `bryon_gift_equipment` | **Wave 3** | **1,188** | — | — |
| `vengeance_chain_strike` | **Wave 3** | **741** | — | — |
| **Tổng cộng (`totalPendingChoicesResolved`)** | **15 loại** | **`69,211`** | **Tổng 6 địa điểm** | **`99.99%`** *(làm tròn 2 chữ số)* |

> **Kiểm chứng toán học:** `10,345 + 9,431 + 7,337 + 7,189 + 6,415 + 6,100 + 5,139 + 3,319 + 3,009 + 2,428 + 2,254 + 2,235 + 2,081 + 1,188 + 741 = 69,211` — khớp chính xác `totalPendingChoicesResolved` trong [`starter-twenty-six-sim-data.json`](./starter-twenty-six-sim-data.json).

---

## 2. Xu hướng Cân bằng 3 Phe qua 4 Giai đoạn (`Classic` → `S8` → `S16` → `S26`)

### 2.1. Tỷ lệ Thắng Chính theo Phe (Power Creep & Convergence Audit)

| Phe | Classic (4,500) | Starter Eight (10,000) | Starter Sixteen (10,000) | **Starter Twenty-Six (15,000)** | Chênh lệch H − S (S26) | Nhận định |
|---|---:|---:|---:|---:|---:|---|
| **Hunter (`lantern-guard`)** | `39.73%` | `49.81%` | `46.96%` | **`41.34%`** | **`-1.47%`** | ✅ Chấm dứt hoàn toàn sự áp đảo của Hunter từ S8 (`+13.61%`) & S16 (`+9.29%`) |
| **Shadow (`mist-order`)** | `45.56%` | `36.20%` | `37.67%` | **`42.81%`** | — | ✅ Phục hồi về gần sát Classic (`45.56%`) mà không vượt quá cân bằng 50/50 |
| **Neutral Primary (`wanderer`)** | `14.71%` | `13.99%` | `15.37%` | **`15.85%`** | — | ✅ Rất ổn định quanh mốc Classic (`14.71%`), tổng 3 phe = `100.00%` |
| **Wanderer Win Rate (5P–8P)** | `35.83%` | `35.59%` | `38.09%` | **`35.92%`** | — | ✅ Solo share `11.21%` + Co-win share `24.71%` — gần như trùng khớp Classic (`35.83%`)! |

### 2.2. Phân rã theo Quy mô Bàn (`4P–8P`, 3,000 trận/mốc)

| Quy mô | Hunter Win % (S16 → **S26**) | Shadow Win % (S16 → **S26**) | Neutral Primary % | Neutral Role Win % | Avg Rounds | Avg Turns | Early End % |
|---|---:|---:|---:|---:|---:|---:|---:|
| **4P** (2H–2S–0N) | `53.35%` → **`47.70%`** | `46.65%` → **`52.30%`** | `0.00%` | — | `10.07` | `32.28` | `0.00%` |
| **5P** (2H–2S–1N) | `52.10%` → **`47.80%`** | `42.05%` → **`45.57%`** | `6.63%` | `45.93%` | `8.30` | `32.22` | `0.67%` |
| **6P** (2H–2S–2N) | `43.65%` → **`39.40%`** | `31.75%` → **`36.57%`** | `24.03%` | `38.42%` | `6.83` | `31.44` | `4.20%` |
| **7P** (2H–2S–3N) | `42.05%` → **`35.07%`** | `38.60%` → **`42.10%`** | `22.83%` | `32.33%` | `5.63` | `31.26` | `3.93%` |
| **8P** (3H–3S–2N) | `43.65%` → **`36.73%`** | `29.30%` → **`37.50%`** | `25.77%` | `33.80%` | `7.50` | `41.82` | `3.63%` |

> **Kết luận về Power Creep:** Không xuất hiện hiện tượng phình sức mạnh làm lệch phe. Ngược lại, **Wave 3 (`starter-twenty-six`) đạt độ cân bằng 3 phe tốt nhất trong tất cả các bộ luật mở rộng** (`41.34%` Hunter / `42.81%` Shadow / `15.85%` Neutral Primary; độ chênh H–S chỉ `-1.47%`; `avgRounds = 7.67` so với `7.34` Classic; `avgDamageDealtPerGame = 65.84` thậm chí thấp hơn S8 `68.75` và S16 `67.89`).

---

## 3. Phân tích Chuyên sâu 9 Hạng mục Cân bằng Bắt buộc

### 3.1. `G43` & Combo `G43 + Holy Robe`
| Ngữ cảnh đối đầu của `G43` | Lượt xuất hiện | Win Rate % | Biến động |
|---|---:|---:|---|
| **Starter Eight (10k)** — G43 tổng thể | 3,165 | `63.79%` | Baseline Phase 2C |
| **Starter Sixteen (10k)** — G43 tổng thể | 2,178 | `62.76%` | `-1.03%` vs S8 |
| **Starter Twenty-Six (15k) — G43 tổng thể** | **2,362** | **`57.75%`** | **`-5.01%` vs S16 (`-6.04%` vs S8)** ✅ |
| **S26: G43 khi KHÔNG có Shadow Wave 3** | 1,057 | `59.41%` | Đối chứng nội bộ |
| **S26: G43 khi CÓ Shadow Wave 3** | 1,305 | `56.40%` | `-3.01%` |
| **S26: G43 đối đầu `Wrath` (skill AoE 2 dmg)** | 399 | **`50.63%`** | **`-8.78%` vs không có Wave 3 Shadow** ✅ Khắc chế mạnh nhất toàn game! |
| **S26: G43 đối đầu `Unchained`** | 386 | `54.15%` | `-5.26%` |
| **S26: G43 đối đầu `Warlock`** | 395 | `56.71%` | `-2.70%` |
| **S26: G43 đối đầu `Visions` (skill tick 1 dmg/lượt)** | 373 | `58.71%` | `-0.70%` |
| **S26: G43 đối đầu `Vengeance` (skill 1d4)** | 391 | `60.61%` | `+1.20%` (phụ thuộc kill trigger) |
| **S26: `G43 + Holy Robe` (`eq-01`)** | **535** | **`69.16%`** 🚨 | S8 `70.10%` → S16 `68.76%` → S26 **`69.16%`** (vẫn là outlier combo #1) |

- **Tách biệt Bot-meta vs Human Playtest:** Tỷ lệ thắng tổng của `G43` đã hạ từ `63.79% → 57.75%` nhờ lượng sát thương `'skill'` xuyên giáp (`Wrath`, `Visions`, `Vengeance`) và xuyên giáp trực tiếp (`Unchained`, `Warlock`). Tuy nhiên, riêng combo **`G43 + Holy Robe`** (chặn tổng `-3` sát thương đòn đánh thường) vẫn đứng cứng quanh **`69%`** suốt cả 3 wave. Trong Human Playtest, cần theo dõi xem người chơi thật có dùng `Cướp đồ`, `Dynamite`, `Flare`, `Ô 9` để tước `Holy Robe` hiệu quả hơn bot hay không trước khi cân nhắc luật trần giảm thương.

### 3.2. `Fujiko` (`exp2_fujiko` — Hunter, 12 HP)
- **Số liệu S26:** `2,368` lượt xuất hiện, **`39.40%` win rate**, `40.33%` survival, `97.26%` reveal, **`472` lần kết liễu (`0.20` lần/trận)**, `0.34` sát thương bonus TB.
- **Đánh giá:** Hoàn toàn cân bằng, không hề quá mạnh. Điều kiện kép (`Fujiko đã lộ + mục tiêu đã lộ + HP <= 4 trước đòn + actualDealt >= 1 sau giảm thương`) ngăn tình trạng kết liễu rẻ tiền, đồng thời bảo toàn counterplay rõ ràng cho `G43 + Holy Robe`, `Witch` tại `corridor` và vai giữ ẩn danh tính. Trong thực chiến người thật, Fujiko có thể mạnh hơn nhẹ (~`42–45%`) vì đồng đội Hunter có thể chủ động bào mục tiêu xuống `<= 4 HP` để Fujiko dứt điểm.

### 3.3. `Wrath` (`exp1_wrath` — Shadow, 14 HP)
- **Số liệu S26:** `2,309` lượt xuất hiện, **`49.59%` win rate** (cao nhất phe Shadow, vượt Classic Werewolf `48.02%`), `50.45%` survival, **`5,481` lần kích hoạt AoE** (`2.37` lần/trận, `7,337` lượt mở prompt), **`8.78` sát thương kỹ năng TB/trận**.
- **Đánh giá & Bot-meta vs Human:**
  - *Bot-meta:* Bot chưa tối ưu hóa việc cố tình rời khỏi cụm của Wrath hay lừa đồng đội Shadow né cụm, nên Wrath liên tục bắn `2` sát thương kỹ năng xuyên giáp (`G43` tụt xuống `50.63%` khi gặp Wrath!). Mức `49.59%` vẫn nằm dưới ngưỡng báo động `50%`, nhưng là **Shadow mạnh nhất pool 36 tướng** và đóng vai trò chính kéo `avgRounds` từ `8.06 → 7.67`.
  - *Giả thuyết Human Playtest:* Khi người chơi thật chủ động né cụm của Wrath (bằng `Emi`, `Fea`, `Father Harrison`, `Mystic Compass`) và buộc Wrath phải cân nhắc sát thương lên đồng đội Shadow đứng chung cụm, tỷ lệ thắng thực tế nhiều khả năng ổn định trong khoảng `44–48%`. Cần theo dõi đặc biệt tỷ lệ thắng Wrath ở bàn 7P–8P đông người.

### 3.4. `Vengeance` (`exp1_vengeance` — Shadow, 13 HP)
- **Số liệu S26:** `2,399` lượt xuất hiện, **`38.77%` win rate**, `38.93%` survival, **`623` lần kích hoạt** (`741` lượt mở prompt — tức `84.1%` chọn kích hoạt khi hạ gục, `0.26` lần/trận), `1.28` sát thương kỹ năng TB/trận.
- **Đánh giá:** Hoàn toàn lành mạnh, không tạo snowball vô hạn. Luật `1 lần/trận`, `1d4` dùng chung cho 2 mục tiêu, và giữ nguyên `skillUsedOnce` nếu `skip` giúp kỹ năng mang tính bùng nổ cao nhưng xác suất kích hoạt tự nhiên vừa phải (`~26%` số trận).

### 3.5. `Visions` (`exp2_visions` — Shadow, 13 HP)
- **Số liệu S26:** `2,295` lượt xuất hiện, **`38.69%` win rate**, `35.60%` survival, **`2,254` lần đặt dấu** (`98.2%` số trận xuất hiện), **`5,368` lần trừ 1 HP đầu lượt** (trung bình **`2.38` lần đốt máu mỗi dấu ấn**), `2.34` sát thương kỹ năng TB/trận.
- **Đánh giá:** Cân bằng rất tốt. Nhịp đốt `1 HP` đầu lượt sau (không trừ ngay lượt đặt dấu) cộng với đánh đổi không thể tấn công thường mục tiêu bị đánh dấu tạo thế giằng co chiến thuật rõ rệt (đặc biệt hiệu quả để bào `Allie` 8 HP hoặc rỉa giáp `G43`), và không hề gây deadlock khi cầm `Masamune`.

### 3.6. `Cruz` (`exp2_cruz` — Neutral, 11 HP)
- **Số liệu S26:** `2,963` lượt xuất hiện, **`21.09%` win rate tổng** (~`625` trận thắng: gồm **`508` trận thắng solo (`17.14%`)** và **`117` trận đồng thắng đồng thời (`3.95%`)** khi đòn kết liễu cùng lượt dùng bài Đen đồng thời chốt điều kiện thắng của phe Hunter/Shadow), `41.75%` survival, `99.90%` reveal, **`2,143` lần đổi bài Đen** (`6,100` prompt, `0.72` lần đổi/trận).
- **Đánh giá & Bot-meta vs Human:** Nằm đúng vùng giữa các Neutral chủ động đi săn như `Bob` (`14.64%`) và `Charles` (`23.27%`). Trong thực chiến người thật, khả năng canh mục tiêu yếu máu, giữ bài Đen (`ev-07..ev-10`) đúng nhịp và dùng `cruz_black_redraw` để săn đúng 4 lá sát thương sẽ đẩy hiệu suất của Cruz lên cao hơn bot (`~25–32%`).

### 3.7. `Bryon` (`exp2_bryon` — Neutral, 10 HP) — Phân tích 5P & Cơ chế Tặng Đồ
- **Số liệu S26:** `2,996` lượt xuất hiện, **`33.24%` win rate tổng** (`996 / 2,996`), `50.97%` survival, `68.62%` reveal, **`1,188` giao dịch tặng trang bị** (`0.40` lần/trận).
  - **Bàn 5P (Bryon là Neutral duy nhất):** `375` lượt xuất hiện → **`176` trận đồng thắng (`46.93%`)**, **`0` lần auto-win đầu trận**.
  - **Bàn 6P–8P (2–3 Neutral):** `2,621` lượt xuất hiện → **`820` trận thắng (`31.29%`)**.
  - **Synergy `Bryon + Bob`:** **`49` trận** Bryon và Bob cùng thắng trong ván (chứng minh cơ chế tặng đồ giúp đồng minh Neutral về đích hoạt động thực sự trên server!).
- **Đánh giá:** Tỷ lệ thắng 5P của Bryon (`46.93%`) **lành mạnh hơn rõ rệt** so với `Cindy` 5P (`66.30%`) và `Allie` (`62.76%`), nhờ HP 10 thấp và động cơ tự nhiên khiến Shadow sẵn sàng loại Bryon. Tại 6P–8P (`31.29%`), việc chỉ cần **1 Neutral bất kỳ chết** là Bryon thua ngay tạo kịch tính bảo vệ đồng minh rất đặc sắc.

### 3.8. `Cindy` & `Bipolar` trong Môi trường 36 Tướng (`starter-twenty-six`)
- **`Cindy` (`exp1_cindy`, 11 HP):** `2,961` lượt xuất hiện, **`37.05%` win rate** (`+2.05%` vs S16 `35.00%`), `62.34%` survival.
  - Bàn 5P: `244 / 368` (**`66.30%`** co-win fallback — giảm nhẹ so với S16 `72.76%` nhờ Shadow mạnh hơn, nhưng vẫn cao và cần đánh giá ở Human Playtest).
  - Bàn 6P–8P: `843 / 2,593` (**`32.51%`** solo win — tăng nhẹ từ `29.34%` do AoE `Wrath`/`Vengeance` giúp giết Neutral khác nhanh hơn).
- **`Bipolar` (`exp1_bipolar`, 10 HP):** `3,083` lượt xuất hiện, **`55.14%` win rate** (`1,700 / 3,083` — giảm `-2.18%` so với S16 `57.32%`), `60.59%` survival: gồm `1,107` trận thắng theo Hunter (còn sống) + `593` trận thắng theo Shadow (đã chết), với `207` lần tự loại bằng `Đồng Xu Định Mệnh`. Vẫn cần theo dõi social counterplay của người chơi thật (cố ý không đánh Bipolar khi Shadow áp đảo).

### 3.9. Ba Vai Wave 3 Còn Lại (`Fallen`, `Fea`, `Eleanor`, `Udi`) — Bot-meta vs Human Playtest
- **`Fallen` (`exp1_fallen`, Hunter 12 HP):** `40.43%` win rate (`2,623` đòn `+2` sát thương, `2.34` bonus dmg/app) — bám sát trung bình Hunter (`41.34%`), rất cân bằng.
- **`Fea` (`exp1_fea`, Hunter 12 HP):** `38.42%` win rate (`5,361` lần chỉnh xúc xắc từ `10,345` prompt, `2.30` lần/app) — rất mượt và ổn định; trong tay người thật chọn ô chiến thuật (`lobby`/`corridor`/`7`), giá trị sẽ còn cao hơn nữa.
- **`Eleanor` (`exp2_eleanor`, Hunter 10 HP):** `33.61%` win rate, `26.47%` survival (`4,517` lần rút thẻ Xanh, `1.95` lần/app) — **ví dụ kinh điển của khoảng cách Bot vs Người thật**: bot không biết truyền đạt thông tin thẻ Xanh qua thảo luận bàn chơi cho đồng đội Hunter và dễ bị bắn gục ở 10 HP. Không nên buff HP/kỹ năng Eleanor trước khi kiểm thử trên người thật!
- **`Udi` (`exp1_udi`, Shadow 11 HP):** **`42.14%` win rate**, **`50.56%` survival** (cao thứ 3 toàn phe Shadow dù chỉ có 11 HP — cao hơn cả Werewolf 14 HP `47.73%` và Wendigo 14 HP `45.23%`!). *Lưu ý kỹ thuật về telemetry:* Trường `udiAttackBlocks: 13` chỉ đếm các sự kiện log khi đòn diện rộng (`Machine Gun`) phải bỏ qua Udi đang ẩn thân; phần lớn giá trị phòng thủ của Udi nằm ở việc bộ lọc mục tiêu server (`listExpandedReachableAttackTargets`) loại thẳng Udi khỏi danh sách mục tiêu hợp lệ **trước khi kẻ tấn công kịp chọn đòn**, thể hiện rõ qua tỷ lệ sống sót `50.56%`.

---

## 4. Bảng Hiệu suất Đầy đủ Toàn bộ 36 Nhân vật (`starter-twenty-six`, 15,000 trận)

### 4.1. Mười Nhân vật Wave 3 (Phase 4)

| Nhân vật | Phe | HP | Lượt | Win % | Survival % | Reveal % | Skill Act./App | Heal TB | Chặn ST TB | Bonus ST TB | Phân loại |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Wrath** (`exp1_wrath`) | Shadow | 14 | 2,309 | **49.59%** | 50.45% | 99.05% | 2.37 | 0.00 | 0.00 | **8.78** | Theo dõi Human Playtest (Shadow #1) |
| **Udi** (`exp1_udi`) | Shadow | 11 | 2,340 | **42.14%** | **50.56%** | 99.49% | 0.01* | 0.00 | 0.00 | 0.00 | ✅ Cân bằng tốt (thụ động chặn chọn mục tiêu) |
| **Fallen** (`exp1_fallen`) | Hunter | 12 | 2,347 | **40.43%** | 37.41% | 99.62% | 1.12 | 0.00 | 0.00 | 2.34 | ✅ Rất cân bằng (ngang trung bình Hunter) |
| **Fujiko** (`exp2_fujiko`) | Hunter | 12 | 2,368 | **39.40%** | 40.33% | 97.26% | 0.20 | 0.00 | 0.00 | 0.34 | ✅ Cân bằng tốt (kết liễu có counterplay) |
| **Vengeance** (`exp1_vengeance`) | Shadow | 13 | 2,399 | **38.77%** | 38.93% | 97.96% | 0.26 | 0.00 | 0.00 | 1.28 | ✅ Cân bằng tốt |
| **Visions** (`exp2_visions`) | Shadow | 13 | 2,295 | **38.69%** | 35.60% | 99.00% | 3.32 | 0.00 | 0.00 | 2.34 | ✅ Cân bằng tốt (`2.38` tick/dấu) |
| **Fea** (`exp1_fea`) | Hunter | 12 | 2,335 | **38.42%** | 39.27% | 98.93% | 2.30 | 0.00 | 0.00 | 0.00 | ✅ Cân bằng tốt |
| **Eleanor** (`exp2_eleanor`) | Hunter | 10 | 2,312 | **33.61%** | 26.47% | 100.00% | 1.95 | 0.00 | 0.00 | 0.00 | ℹ️ Bot-meta thấp (vai suy luận xã hội) |
| **Bryon** (`exp2_bryon`) | Neutral | 10 | 2,996 | **33.24%** | 50.97% | 68.62% | 0.40 | 0.00 | 0.00 | 0.00 | ✅ Cân bằng tốt (`46.93%` ở 5P, `31.29%` ở 6–8P) |
| **Cruz** (`exp2_cruz`) | Neutral | 11 | 2,963 | **21.09%** | 41.75% | 99.90% | 0.72 | 0.00 | 0.00 | 0.00 | ✅ Cân bằng (giữa Bob `14.64%` & Charles `23.27%`) |

### 4.2. Hai Mươi Sáu Nhân vật Classic, Wave 1 & Wave 2 trong Pool `starter-twenty-six`

| Nhân vật | Đợt | Phe | HP | Lượt | Win % (S26) | Survival % | Reveal % |
|---|---|---|---:|---:|---:|---:|---:|
| **G43** (`exp2_g43`) | Wave 1 | Hunter | 14 | 2,362 | **57.75%** ⚠️ | 75.57% | 99.03% |
| **Gloria** (`exp2_gloria`) | Wave 2 | Hunter | 14 | 2,377 | 44.89% | 48.76% | 98.19% |
| **Minh "Kỹ Thuật"** (George) | Classic | Hunter | 14 | 2,363 | 44.56% | 50.19% | 98.43% |
| **Vy "Radio"** (Franklin) | Classic | Hunter | 12 | 2,341 | 42.93% | 44.00% | 98.59% |
| **Gayle** (`exp1_gayle`) | Wave 1 | Hunter | 14 | 2,338 | 42.77% | 47.90% | 98.72% |
| **Fiona** (`exp2_fiona`) | Wave 1 | Hunter | 12 | 2,346 | 41.90% | 43.31% | 98.85% |
| **Elysia** (`exp1_elysia`) | Wave 2 | Hunter | 10 | 2,338 | 38.75% | 39.09% | 98.55% |
| **Felicia** (`exp1_felicia`) | Wave 1 | Hunter | 12 | 2,338 | 36.95% | 38.32% | 99.91% |
| **Father Harrison** (`exp2_father_harrison`) | Wave 2 | Hunter | 12 | 2,414 | 35.71% | 36.70% | 99.71% |
| **Lan "Trực Ban"** (Emi) | Classic | Hunter | 10 | 2,421 | 34.86% | 37.63% | 92.85% |
| **Dũng "Gác Cổng"** (Werewolf) | Classic | Shadow | 14 | 2,376 | 48.02% | 47.73% | 99.28% |
| **Tú "Ẩn Danh"** (Vampire) | Classic | Shadow | 13 | 2,361 | 44.81% | 51.12% | 92.84% |
| **Unchained** (`exp2_unchained`) | Wave 2 | Shadow | 11 | 2,379 | 44.09% | 41.36% | 98.82% |
| **Witch** (`exp2_witch`) | Wave 2 | Shadow | 14 | 2,479 | 44.09% | 53.53% | 94.55% |
| **Undying** (`exp1_undying`) | Wave 1 | Shadow | 11 | 2,299 | 43.89% | 48.54% | 94.08% |
| **Warlock** (`exp2_warlock`) | Wave 2 | Shadow | 14 | 2,380 | 41.43% | 41.97% | 97.44% |
| **Victor** (`exp1_victor`) | Wave 1 | Shadow | 13 | 2,362 | 39.88% | 35.86% | 98.43% |
| **Wendigo** (`exp1_wendigo`) | Wave 1 | Shadow | 14 | 2,328 | 39.22% | 45.23% | 99.14% |
| **Wyvern** (`exp2_wyvern`) | Wave 1 | Shadow | 14 | 2,292 | 39.22% | 41.58% | 98.12% |
| **Khánh "Tin Giả"** (Unknown) | Classic | Shadow | 11 | 2,401 | 38.65% | 43.90% | 62.72% |
| **Trang "Kiên Cường"** (Allie) | Classic | Neutral | 8 | 2,954 | **62.76%** | 62.76% | 77.93% |
| **Bipolar** (`exp1_bipolar`) | Wave 2 | Neutral | 10 | 3,083 | **55.14%** | 60.59% | 93.71% |
| **Đạt "Cảm Tử"** (Daniel) | Classic | Neutral | 13 | 3,097 | 39.43% | 58.02% | 100.00% |
| **Cindy** (`exp1_cindy`) | Wave 2 | Neutral | 11 | 2,961 | 37.05% | 62.34% | 90.34% |
| **Bách "Cuồng Chiến"** (Charles) | Classic | Neutral | 11 | 2,982 | 23.27% | 53.15% | 70.76% |
| **Hải "Sưu Tầm"** (Bob) | Classic | Neutral | 10 | 2,964 | 14.64% | 53.41% | 72.44% |

---

## 5. Khuyến nghị cho Đợt Human Playtest `starter-twenty-six` (Không chỉnh thông số trong Phase 4)

1. **Giữ nguyên 100% thông số HP & kỹ năng của cả 36 nhân vật** khi bước vào Internal Human Playtest trên staging (`ALLOW_EXPERIMENTAL_RULESETS=1`).
2. **Bốn giả thuyết cần kiểm chứng bằng dữ liệu người thật (≥ 100 trận):**
   - **`G43 + Holy Robe` (`69.16%`):** Dù `G43` tổng đã hạ xuống `57.75%`, nếu combo `G43 + Holy Robe` vẫn giữ `> 62%` ở người thật thì cân nhắc quy tắc trần giảm sát thương đòn đánh tối đa `2` hoặc không cộng dồn `G43` với `Holy Robe` trong bản cân bằng hậu-playtest.
   - **`Wrath` (`49.59%`) ở bàn 7P–8P:** Theo dõi mức độ ảnh hưởng của friendly-fire lên đồng đội Shadow và khả năng né cụm của người chơi thật.
   - **`Eleanor` (`33.61%`) & `Cruz` (`21.09%`):** Đánh giá sức mạnh thực tế khi có giao tiếp bàn chơi (Eleanor chia sẻ thẻ Xanh; Cruz canh dứt điểm có chủ đích).
   - **`Cindy` 5P (`66.30%`) & `Bipolar` (`55.14%`):** So sánh với `Bryon` 5P (`46.93%`) để quyết định xem có cần thống nhất luật dự phòng 5P cho các Neutral đặc biệt hay không.
