# Bóng Đêm KTX — Phase 3C 10,000-Match Simulation & Balance Report (`starter-sixteen`)

> **Nguồn dữ liệu:** Chạy thực tế `node scripts/sim-starter-sixteen.cjs --write-json` (**10,000 trận deterministic**: 2,000 trận × 5 quy mô `4P–8P`, cùng bộ seed `7,000,000 + playerCount×100,000 + g + 1` để đối chiếu ghép cặp với `starter-eight`; dữ liệu thô tại [`starter-sixteen-sim-data.json`](./starter-sixteen-sim-data.json)) đối chiếu với `starter-eight` (`10,000` trận, [`starter-eight-sim-data.json`](../phase-2/starter-eight-sim-data.json)) và `classic` (`4,500` trận, `node test/boardgame-sim.cjs`).
> **Nguyên tắc cân bằng:** Không tự ý buff/nerf thông số HP hay kỹ năng nhân vật trong Phase 3 chỉ dựa trên bot simulation. Toàn bộ đánh giá bên dưới là cơ sở dữ liệu khách quan cho **Internal Human Playtest** trên pool `starter-sixteen` (vẫn khóa cứng trên production).

---

## 1. Tổng quan Hiệu năng, Nhịp Trận & Độ Ổn định (`classic` vs `starter-eight` vs `starter-sixteen`)

| Chỉ số | Classic (4,500 trận) | Starter Eight (10,000 trận) | **Starter Sixteen (10,000 trận)** | Delta (S16 vs S8) | Đánh giá |
|---|---:|---:|---:|---:|---|
| **Pool nhân vật khả dụng** | 10 (3H/3S/4N) | 18 (7H/7S/4N) | **26 (10H/10S/6N)** | `+8` | ✅ Đủ 3 phe |
| **Tổng trận hoàn tất** | 4,500 / 4,500 | 10,000 / 10,000 | **10,000 / 10,000** | — | ✅ 100% hoàn tất |
| **Trận bị treo (`stalledGames`)** | 0 | 0 | **0** | `0` | ✅ 0 deadlock |
| **Trận hòa (`draws`)** | 0 | 0 | **0** | `0` | ✅ 0 draw |
| **Vi phạm P0 (`botAccessViolations`)** | 0 | 0 | **0** | `0` | ✅ Zero secret leak |
| **Số vòng TB (`avgRounds`)** | `7.34` | `8.31` | **`8.06`** | `-0.25` | ✅ Gần nhịp Classic hơn |
| **Số lượt TB (`avgTurns`)** | `32.36` | `36.01` | **`35.42`** | `-0.59` | ✅ Nhịp gọn (~10–15 phút) |
| **Chạm trần vòng (`reachedMaxRoundPct`)** | — | `0.63%` | **`0.59%`** | `-0.04%` | ✅ An toàn |
| **Kết thúc sớm V1–V2 (`earlyEndRounds1To2Pct`)** | `2.02%` | `1.82%` | **`1.59%`** | `-0.23%` | ✅ An toàn (`< 5%`) |
| **Tỷ lệ chết V1 / ghế (`round1PlayerDeathRatePct`)** | `0.448%` | `0.560%` | **`0.430%`** | `-0.130%` | ✅ Tốt hơn cả Classic |
| **Hạ gục TB / trận (`avgEliminationsPerGame`)** | `3.21` | `3.25` | **`3.19`** | `-0.06` | ✅ Ổn định |
| **Tổng sát thương TB / trận** | — | `68.75` | **`67.89`** | `-0.86` | ✅ Không power creep quá mức |
| **Tổng Pending Choices đã giải quyết** | `0` | `43,547` (6 loại) | **`49,533` (9 loại)** | `+5,986` | ✅ 9/9 loại choice trơn tru |

### Phân bố 49,533 Pending Choices qua 9 loại & Phân bố Chiếm giữ Địa điểm

| Pending Choice Kind | Lượt xử lý | Địa điểm KTX (Location Alias) | Tỷ lệ lượt đứng |
|---|---:|---|---:|
| `felicia_draw_choice` | **8,798** | `breaker` (4–5) | `24.98%` |
| `gayle_attack_reroll` | **7,604** | `lobby` (`Church` · 6) | `19.31%` |
| `fiona_attack_roll` | **6,276** | `corridor` (`Weird Woods` · 9) | `17.88%` |
| `victor_blood_boost` | **5,057** | `radio` (2–3) | `15.43%` |
| `bipolar_fate_coin` *(Wave 2)* | **2,920** | `canteen` (8) | `14.30%` |
| `cindy_reveal_retaliate` *(Wave 2 · Secret)* | **2,710** | `court` (`Erstwhile Altar` · 10) | `8.10%` |
| `elysia_counter_boost` *(Wave 2)* | **2,200** | — | — |
| `undying_reveal_reduce` *(Secret)* | **2,127** | — | — |
| `wendigo_reveal_heal` *(Secret)* | **1,841** | — | — |

---

## 2. Tỷ lệ Thắng theo Phe & Quy mô Bàn (4P–8P)

### 2.1. Tổng thể 3 Phe (Paired-Seed Comparison)

| Chỉ số Phe | Classic (4,500) | Starter Eight (10,000) | **Starter Sixteen (10,000)** | Delta (S16 vs S8) | Nhận định |
|---|---:|---:|---:|---:|---|
| **Hunter (`lantern-guard`)** | `39.73%` | `49.81%` | **`46.96%`** | **`-2.85%`** | ✅ Giảm áp đảo Hunter, tiến gần Classic hơn |
| **Shadow (`mist-order`)** | `45.56%` | `36.20%` | **`37.67%`** | **`+1.47%`** | ✅ Cải thiện rõ rệt nhất ở bàn 4P (`+5.20%`) & 5P (`+5.50%`) |
| **Neutral Primary (`wanderer`)** | `14.71%` | `13.99%` | **`15.37%`** | **`+1.38%`** | ✅ Rất sát mốc Classic (`14.71%`), có 684 trận Cindy thắng độc lập |
| **Wanderer Win Rate (5P–8P)** | `35.83%` | `35.59%` | **`38.09%`** | `+2.50%` | Solo share `10.43%` + Co-win share `27.66%` (tăng nhẹ do Bipolar) |

### 2.2. Phân rã theo Quy mô Bàn (`4P–8P`, 2,000 trận/mốc)

| Quy mô | Hunter Win % (S8 → **S16**) | Shadow Win % (S8 → **S16**) | Neutral Primary % | Neutral Role Win % | Avg Rounds | Avg Turns | Early End % |
|---|---:|---:|---:|---:|---:|---:|---:|
| **4P** (2H–2S–0N) | `58.55%` → **`53.35%`** | `41.45%` → **`46.65%`** | `0.00%` | — | `10.89` | `34.74` | `0.00%` |
| **5P** (2H–2S–1N) | `52.45%` → **`52.10%`** | `36.55%` → **`42.05%`** | `5.85%` | `51.05%` | `8.67` | `33.67` | `0.60%` |
| **6P** (2H–2S–2N) | `48.80%` → **`43.65%`** | `32.90%` → **`31.75%`** | `24.60%` | `39.57%` | `7.01` | `32.50` | `2.75%` |
| **7P** (2H–2S–3N) | `41.30%` → **`42.05%`** | `40.15%` → **`38.60%`** | `19.35%` | `34.02%` | `5.96` | `32.86` | `2.50%` |
| **8P** (3H–3S–2N) | `47.95%` → **`43.65%`** | `29.95%` → **`29.30%`** | `27.05%` | `36.23%` | `7.78` | `43.34` | `2.10%` |

> **Phát hiện nổi bật:**
> 1. **Bàn 4P cải thiện mạnh nhất (`58.55/41.45` → `53.35/46.65`):** Nhờ bộ ba Shadow Wave 2 (`Unchained`, `Warlock`, `Witch`) vừa xuyên giáp G43 vừa tăng sinh tồn cho Shadow, khoảng cách Hunter–Shadow tại 4P thu hẹp từ `17.10%` xuống còn **`6.70%`**!
> 2. **Bàn 6P & 8P có tỷ lệ Neutral Primary cao hơn (`24.60%` & `27.05%`):** Khi bàn chỉ có đúng **2 Neutral** và có mặt **Cindy**, chỉ cần 1 Neutral kia bị loại là Cindy lập tức thắng solo (trong khi tại 7P có 3 Neutral, Cindy cần 2 Neutral kia chết nên cân bằng hơn).

---

## 3. Phân tích Chuyên biệt: Tác động Wave 2 lên Outlier `G43` & `G43 + Holy Robe`

Một mục tiêu chiến lược của Wave 2 là đánh giá liệu lực lượng Shadow xuyên giáp (`Unchained +2`, `Warlock +3`, `Witch` giữ vị trí) có giảm bớt sự áp đảo của `G43` (`63.79%`) và `G43 + Holy Robe` (`70.10%`) từ Phase 2C hay không:

| Ngữ cảnh đối đầu của `G43` | Lượt xuất hiện | Win Rate % | Chênh lệch so với đối chiếu |
|---|---:|---:|---|
| **Phase 2C (`starter-eight`) — G43 tổng thể** | 3,165 | **`63.79%`** | Baseline |
| **Phase 3C (`starter-sixteen`) — G43 tổng thể** | 2,178 | **`62.76%`** | `-1.03%` (tỷ lệ gặp G43/trận giảm từ `31.65%` → `21.78%`) |
| **Phase 2C (`starter-eight`) — G43 + Holy Robe** | 836 | **`70.10%`** | Baseline combo |
| **Phase 3C (`starter-sixteen`) — G43 + Holy Robe** | 541 | **`68.76%`** | `-1.34%` |
| **S16: G43 khi KHÔNG có Shadow Wave 2 trong ván** | 912 | **`66.23%`** | Đối chứng nội bộ S16 |
| **S16: G43 khi CÓ ít nhất 1 Shadow Wave 2** | 1,266 | **`60.27%`** | **`-5.96%`** ✅ Khắc chế thực sự! |
| **S16: G43 khi đối đầu `Unchained` (`+2` on hit)** | 504 | **`59.33%`** | **`-6.90%`** ✅ Xuyên giáp ổn định |
| **S16: G43 khi đối đầu `Warlock` (`+3` tại `court`)** | 524 | **`58.02%`** | **`-8.21%`** ✅ Khắc chế trực tiếp mạnh nhất |

> **Kết luận khách quan về G43:** Khi có mặt `Warlock` hoặc `Unchained`, tỷ lệ thắng của `G43` giảm rõ rệt **`6–8 điểm phần trăm`** (`66.23% → 58.02% / 59.33%`), chứng minh hướng thiết kế Wave 2 tạo counterplay đúng hướng. Tuy nhiên, vì 3 Shadow Wave 2 không xuất hiện trong mọi ván (pool 10 Shadow), tổng win rate của `G43` (`62.76%`) và `G43 + Holy Robe` (`68.76%`) **vẫn là outlier #1** trong bot play và cần được ghi nhận ưu tiên trong đợt Human Playtest (chưa chỉnh sửa tự ý trong Phase 3).

---

## 4. Bảng Hiệu suất Đầy đủ 26 Nhân vật (`starter-sixteen`)

### 4.1. Tám Nhân vật Wave 2 (Phase 3)

| Nhân vật | Phe | HP | Lượt | Win % | Survival % | Reveal % | Skill Act./Trận | Heal TB | Chặn ST TB | Bonus ST TB | Đánh giá |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Gloria** (`exp2_gloria`) | Hunter | 14 | 2,185 | **49.29%** | 50.30% | 98.49% | 1.97 | 0.00 | 0.00 | 0.00 | Khỏe (tương đương George `48.61%`), theo dõi `Gloria + ≥3 đồ` (`64.79%`) |
| **Elysia** (`exp1_elysia`) | Hunter | 10 | 2,154 | **43.87%** | 39.74% | 99.40% | 1.02 | 0.00 | 0.00 | 2.04 | ✅ Cân bằng tốt (glass-cannon 10 HP) |
| **Father Harrison** (`exp2_father_harrison`) | Hunter | 12 | 2,158 | **42.31%** | 39.02% | 99.91% | 3.15 | 0.00 | 0.00 | 0.00 | ✅ Cân bằng tốt (luật cấm đứng yên farm `lobby` phát huy hiệu quả!) |
| **Witch** (`exp2_witch`) | Shadow | 14 | 2,149 | **39.09%** | **49.09%** | 95.72% | 0.41 | 0.00 | 0.97 | 0.00 | ✅ Mạnh nhất nhóm Shadow mở rộng; hiệu ứng răn đe tại `corridor` cao |
| **Unchained** (`exp2_unchained`) | Shadow | 11 | 2,204 | **37.70%** | 35.03% | 99.05% | 2.34 | 0.00 | 0.00 | **4.87** | ✅ Gây sát thương cộng thêm cao nhất toàn game; 11 HP giữ rủi ro hợp lý |
| **Warlock** (`exp2_warlock`) | Shadow | 14 | 2,215 | **35.53%** | 37.25% | 98.01% | 0.62 | 0.00 | 0.00 | 2.00 | Ổn (chịu giới hạn xác suất vào `court` `8.10%`, khắc chế G43 tốt) |
| **Cindy** (`exp1_cindy`) | Neutral | 11 | 2,654 | **35.00%** | 58.48% | 91.26% | 2.79 | 0.00 | 0.00 | 2.79 | ✅ Tổng thể rất cân bằng (`35%`); **cần theo dõi 5P fallback (`72.76%`)** |
| **Bipolar** (`exp1_bipolar`) | Neutral | 10 | 2,678 | **57.32%** ⚠️ | 57.47% | 93.95% | 0.54 | 1.91 | 0.00 | 0.00 | ⚠️ Cao tương đương Allie (`58.32%`), theo dõi phản ứng người thật |

#### Chi tiết Telemetry riêng cho 2 Neutral mới (`Cindy` & `Bipolar`)
- **Cindy (`2,654` lượt xuất hiện):**
  - `6P–8P` (`2,331` lượt): **`684` trận thắng độc lập (`29.34%`)** — cơ chế *Sống sót khi toàn bộ Neutral khác chết* hoạt động sôi nổi, không quá mạnh cũng không quá yếu.
  - `5P` (`323` lượt — là Neutral duy nhất trên bàn): **`0` lần auto-win đầu trận**, đạt `235/323` (`72.76%`) đồng thắng khi sống tới cuối ván (do luật dự phòng 5P tương tự Allie). *Khuyến nghị:* Ghi nhận phản hồi playtest xem 5P có nên dùng điều kiện khó hơn (ví dụ sống sót & có `>= 2` trang bị) hay giữ đơn giản.
- **Bipolar (`2,678` lượt xuất hiện):**
  - Tổng thắng **`1,535 / 2,678` (`57.32%`)**: gồm **`1,042` lần thắng theo Hunter (còn sống)** và **`493` lần thắng theo Shadow (đã chết)**; `0` lần thắng sai khi Neutral khác thắng solo!
  - Sử dụng `Đồng Xu Định Mệnh`: `1,250` lần chọn `heal_self`, `206` lần chọn `damage_self` (trong đó **`196` lần tự loại thành công** để chốt kèo Shadow thắng!).

### 4.2. Mười Tám Nhân vật Classic & Starter Eight trong Pool `starter-sixteen`

| Nhân vật | Đợt | Phe | HP | Lượt | Win % (S16) | Survival % | Reveal % |
|---|---|---|---:|---:|---:|---:|---:|
| **G43** (`exp2_g43`) | Starter Eight | Hunter | 14 | 2,178 | **62.76%** ⚠️ | 79.52% | 99.36% |
| **Minh "Kỹ Thuật"** (George) | Classic | Hunter | 14 | 2,164 | 48.61% | 52.40% | 98.80% |
| **Gayle** (`exp1_gayle`) | Starter Eight | Hunter | 14 | 2,402 | 47.00% | 50.33% | 99.21% |
| **Vy "Radio"** (Franklin) | Classic | Hunter | 12 | 2,183 | 46.36% | 47.23% | 99.04% |
| **Fiona** (`exp2_fiona`) | Starter Eight | Hunter | 12 | 2,198 | 44.22% | 46.82% | 99.32% |
| **Felicia** (`exp1_felicia`) | Starter Eight | Hunter | 12 | 2,125 | 42.02% | 39.34% | 100.00% |
| **Lan "Trực Ban"** (Emi) | Classic | Hunter | 10 | 2,253 | 40.17% | 39.59% | 94.45% |
| **Dũng "Gác Cổng"** (Werewolf) | Classic | Shadow | 14 | 2,187 | 43.48% | 43.94% | 99.68% |
| **Tú "Ẩn Danh"** (Vampire) | Classic | Shadow | 13 | 2,244 | 39.71% | 45.28% | 93.98% |
| **Undying** (`exp1_undying`) | Starter Eight | Shadow | 11 | 2,162 | 37.28% | 43.06% | 95.51% |
| **Victor** (`exp1_victor`) | Starter Eight | Shadow | 13 | 2,224 | 36.15% | 31.97% | 98.97% |
| **Wyvern** (`exp2_wyvern`) | Starter Eight | Shadow | 14 | 2,208 | 35.01% | 36.32% | 98.78% |
| **Wendigo** (`exp1_wendigo`) | Starter Eight | Shadow | 14 | 2,145 | 33.89% | 38.14% | 99.39% |
| **Khánh "Tin Giả"** (Unknown) | Classic | Shadow | 11 | 2,262 | 31.39% | 36.47% | 69.50% |
| **Trang "Kiên Cường"** (Allie) | Classic | Neutral | 8 | 2,675 | 58.32% | 58.32% | 78.88% |
| **Đạt "Cảm Tử"** (Daniel) | Classic | Neutral | 13 | 2,639 | 42.52% | 55.63% | 99.92% |
| **Bách "Cuồng Chiến"** (Charles) | Classic | Neutral | 11 | 2,693 | 22.54% | 50.50% | 73.15% |
| **Hải "Sưu Tầm"** (Bob) | Classic | Neutral | 10 | 2,661 | 12.81% | 48.21% | 74.22% |

---

## 5. Phân tích Combo & Khuyến nghị Trước Human Playtest

| Combo | Lượt xuất hiện | Win % | Mức rủi ro | Ghi chú |
|---|---:|---:|---|---|
| **G43 + Holy Robe (`eq-01`)** | 541 | **68.76%** 🚨 | **CAO** | Giảm `-1.34%` so với S8 (`70.10%`), vẫn cần theo dõi sát trong playtest người thật |
| **Gloria + ≥ 3 Trang bị** | 872 | **64.79%** | **TRUNG BÌNH** | Tự nhiên với 14 HP + tốc độ rút 2 Trắng tại `lobby`; tổng thể Gloria vẫn cân bằng (`49.29%`) |
| **Father Harrison + ≥ 3 Trang bị** | 502 | **61.95%** | **THẤP–TB** | Luật cấm đứng yên tại `lobby` giữ tỷ lệ tổng của Harrison ở `42.31%` |
| **Elysia + Vũ khí** | 1,105 | **51.40%** | **THẤP** | Hoàn toàn cân bằng nhờ trần kiểm tra `< 3` trước phòng thủ |
| **Victor + Machine Gun** | 326 | **47.85%** | **THẤP** | Giới hạn +2 cho 1 mục tiêu tiếp tục kiểm soát tốt |
| **Undying + Holy Robe** | 396 | **44.44%** | **THẤP** | Ngưỡng `>= 2` sau giảm thương ổn định |
| **Unchained + Vũ khí** | 1,152 | **43.84%** | **THẤP** | 11 HP tạo thế đổi máu kịch tính, không phá cân bằng |
| **Warlock + Vũ khí** | 1,384 | **41.55%** | **THẤP** | Gắn với xác suất ô `court` (`8.10%`), cân bằng tự nhiên |

### Khuyến nghị Playtest (Chưa thay đổi thông số trong Phase 3)
1. **Giữ nguyên thông số 26 nhân vật** bước vào đợt **Internal Playtest Beta (`starter-sixteen`)** để thu thập dữ liệu người thật (vì bot chưa tái hiện được tâm lý lừa vai, phối hợp nhường kill hay cố tình giữ sống Bipolar khi Shadow dẫn trước).
2. **Ba hạng mục theo dõi ưu tiên trong Playtest:**
   - **G43 (`62.76%` / `68.76%` với Holy Robe):** Nếu người thật vẫn ghi nhận `> 58%` sau ≥ 100 ván playtest, cân nhắc house rule *không cộng dồn giảm thương đòn đánh vượt quá 2* hoặc *HP 13* ở đợt điều chỉnh hậu-playtest.
   - **Bipolar (`57.32%`) & Allie (`58.32%`):** Theo dõi liệu người chơi Shadow thực tế có chủ động *tránh đánh Bipolar* để vô hiệu hóa nhánh thắng chết theo Shadow hay không.
   - **Cindy tại 5P (`72.76%` co-win fallback) & 6P/8P (`24.6%–27.05%` Neutral primary):** Thu thập cảm nhận của bàn 5P (1 Neutral) và 6P (2 Neutral) về tốc độ kết thúc của nhánh thắng solo Cindy.
