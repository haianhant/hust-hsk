# Bóng Đêm KTX — Phase 5E 20,000-Match Simulation & Balance Report (`starter-thirty-eight`)

> **Nguồn dữ liệu:** Chạy thực tế `node scripts/sim-starter-thirty-eight.cjs --write-json` (**20,000 trận deterministic**: 4,000 trận × 5 quy mô `4P–8P`, bộ seed `9_000_000 + playerCount * 100_000 + g + 1`, skill-aware bots bao phủ đủ **48 vai trò**, **22 loại Pending Choice** và thực thi chính sách riêng tư `SET_REACTION_PREF`; dữ liệu thô tại [`starter-thirty-eight-sim-data.json`](./starter-thirty-eight-sim-data.json)), đối chiếu xuyên suốt với `starter-twenty-six` (`15,000` trận), `starter-sixteen` (`10,000` trận), `starter-eight` (`10,000` trận) và `classic` (`4,500` trận).
> **Nguyên tắc cân bằng:** Tuyệt đối **không tự động buff/nerf** HP hay kỹ năng nhân vật chỉ dựa trên bot simulation. Mọi ngoại lệ được gắn cờ minh bạch để kiểm chứng bằng Human Playtest.

---

## 1. Tổng quan Hiệu năng, Nhịp Trận & Độ Ổn định (`Classic` → `S8` → `S16` → `S26` → `S38`)

| Chỉ số | Classic (4,500) | S8 (10,000) | S16 (10,000) | S26 (15,000) | **S38 (20,000)** | Delta (S38 vs S26) | Đánh giá |
|---|---:|---:|---:|---:|---:|---:|---|
| **Pool nhân vật khả dụng** | 10 (3H/3S/4N) | 18 (7H/7S/4N) | 26 (10H/10S/6N) | 36 (14H/14S/8N) | **48 (18H/18S/12N)** | `+12` | ✅ Cân xứng 3 phe (`+4/+4/+4`) |
| **Tổng trận hoàn tất** | 4,500 / 4,500 | 10,000 / 10,000 | 10,000 / 10,000 | 15,000 / 15,000 | **20,000 / 20,000** | `+5,000` | ✅ 100% hoàn tất (`58.85s`) |
| **Trận bị treo (`stalledGames`)** | 0 | 0 | 0 | 0 | **0** | `0` | ✅ 0 deadlock |
| **Trận hòa (`draws`)** | 0 | 0 | 0 | 0 | **0** | `0` | ✅ 0 draw |
| **Vi phạm P0 (`botAccessViolations`)** | 0 | 0 | 0 | 0 | **0** | `0` | ✅ Zero secret leak |
| **Số vòng TB (`avgRounds`)** | `7.34` | `8.31` | `8.06` | `7.67` | **`7.29`** | `-0.38` | ✅ Trùng khít nhịp Classic (`7.34`)! |
| **Số lượt TB (`avgTurns`)** | `32.36` | `36.01` | `35.42` | `33.81` | **`32.18`** | `-1.63` | ✅ Trùng khít nhịp Classic (`32.36`)! |
| **Chạm trần vòng (`reachedMaxRoundPct`)** | — | `0.63%` | `0.59%` | `0.38%` | **`0.26%`** | `-0.12%` | ✅ Thấp nhất lịch sử |
| **Kết thúc sớm V1–V2 (`earlyEndRounds1To2Pct`)** | `2.02%` | `1.82%` | `1.59%` | `2.49%` | **`3.54%`** | `+1.05%` | ✅ An toàn (`< 5%`, do Dalton/Arlene solo) |
| **Tỷ lệ chết V1 / ghế (`round1PlayerDeathRatePct`)** | `0.448%` | `0.560%` | `0.430%` | `0.482%` | **`0.671%`** | `+0.189%` | ⚠️ Tăng nhẹ do Umibozu/Warlord — theo dõi playtest |
| **Hạ gục TB / trận (`avgEliminationsPerGame`)** | `3.21` | `3.25` | `3.19` | `3.18` | **`3.10`** | `-0.08` | ✅ Ổn định |
| **Tổng sát thương TB / trận** | — | `68.75` | `67.89` | `65.84` | **`63.16`** | `-2.68` | ✅ Không lạm phát sát thương |
| **Tổng Pending Choices (`totalPendingChoicesResolved`)** | `0` | `43,547` (6) | `39,533` (9) | `69,211` (15) | **`77,626` (22 loại)** | `+8,415` | ✅ Khớp 100% tổng lập trình từ JSON |

### 1.1. Đối chiếu Toàn bộ 22 Loại Pending Choices (`totalPendingChoicesResolved = 77,626`) & `SET_REACTION_PREF`

| Pending Choice Kind | Đợt | Lượt xử lý | Pending Choice Kind | Đợt | Lượt xử lý |
|---|---|---:|---|---|---:|
| `fea_move_adjust` | Wave 3 | **10,374** | `elise_distribute_heal` | **Wave 4** | **2,052** |
| `felicia_draw_choice` | Wave 1 | **9,051** | `cindy_reveal_retaliate` *(Secret)* | Wave 2 | **1,801** |
| `wrath_turn_start_aoe` | Wave 3 | **7,449** | `gwendolen_counter_attack` | **Wave 4** | **1,628** |
| `gayle_attack_reroll` | Wave 1 | **7,244** | `undying_reveal_reduce` *(Secret)* | Wave 1 | **1,540** |
| `fiona_attack_roll` | Wave 1 | **6,328** | `wendigo_reveal_heal` *(Secret)* | Wave 1 | **1,368** |
| `victor_blood_boost` | Wave 1 | **5,465** | `bryon_gift_equipment` | Wave 3 | **1,057** |
| `cruz_black_redraw` | Wave 3 | **5,462** | `vengeance_chain_strike` | Wave 3 | **791** |
| `freyja_extra_attack` | **Wave 4** | **3,592** | `urban_legend_reveal_heal` *(Secret)* | **Wave 4** | **746** |
| `bianca_discard_prevent` | **Wave 4** | **3,434** | `usurper_reveal_block_heal` *(Secret)* | **Wave 4** | **743** |
| `bipolar_fate_coin` | Wave 2 | **2,774** | `warlord_pull_attack` *(Direct-target)* | **Wave 4** | **0*** |
| `elysia_counter_boost` | Wave 2 | **2,424** | — | — | — |
| `visions_mark_target` | Wave 3 | **2,303** | **Tổng cộng (`totalPendingChoicesResolved`)** | **22 loại** | **`77,626`** |

- **Kiểm chứng toán học:** `6328 + 1368 + 7244 + 9051 + 5465 + 1540 + 2424 + 1801 + 2774 + 10374 + 7449 + 791 + 2303 + 5462 + 1057 + 2052 + 746 + 1628 + 3592 + 0 + 743 + 3434 = 77,626` — khớp chính xác `totalPendingChoicesResolved` trong JSON.
- *Lưu ý `warlord_pull_attack`:* Trong bot harness, Warlord truyền trực tiếp `{ type: 'USE_SKILL', targetPlayerId }` nên kích hoạt **`2,378` lần kéo** mà không cần mở modal chọn lại mục tiêu; đường mở prompt `warlord_pull_attack` khi người chơi bấm nút không truyền `targetPlayerId` đã được kiểm thử đầy đủ trong `P5C-5`.
- **Phân bổ `SET_REACTION_PREF` trên `120,000` ghế người chơi (`20,000 × 6` TB):** `ASK = 113,178`, `AUTO_DECLINE = 2,331`, `AUTO_ACTIVATE_WHEN_ELIGIBLE = 4,491`.
- **Phân bổ đứng tại 6 địa điểm KTX:** `breaker 25.10%`, `lobby (Church) 19.42%`, `corridor (Weird Woods) 17.33%`, `radio 15.58%`, `canteen 14.87%`, `court (Erstwhile Altar) 7.69%`.

---

## 2. Xu hướng Cân bằng 3 Phe (`Classic` → `S8` → `S16` → `S26` → `S38`)

| Phe | Classic (4,500) | S8 (10,000) | S16 (10,000) | S26 (15,000) | **S38 (20,000)** | Nhận định |
|---|---:|---:|---:|---:|---:|---|
| **Hunter (`lantern-guard`)** | `39.73%` | `49.81%` | `46.96%` | `41.34%` | **`38.61%`** | ✅ Chỉ chênh `-1.12%` so với Classic (`39.73%`) |
| **Shadow (`mist-order`)** | `45.56%` | `36.20%` | `37.67%` | `42.81%` | **`44.15%`** | ✅ Chỉ chênh `-1.41%` so với Classic (`45.56%`) |
| **Neutral Primary (`wanderer`)** | `14.71%` | `13.99%` | `15.37%` | `15.85%` | **`17.25%`** | ✅ Tăng `+1.40%` nhờ Dalton/Arlene solo wins (`100.01%` do làm tròn) |
| **Wanderer Win Rate (5P–8P)** | `35.83%` | `35.59%` | `38.09%` | `35.92%` | **`37.02%`** | ✅ Solo `12.68%` + Co-win `24.35%` (32,000 lượt Neutral) |

### 2.1. Phân rã theo Quy mô Bàn (`4P–8P`, 4,000 trận/mốc)

| Quy mô | Hunter Win % | Shadow Win % | Neutral Primary % | Neutral Role Win % | Avg Rounds | Avg Turns | Early End % |
|---|---:|---:|---:|---:|---:|---:|---:|
| **4P** (2H–2S–0N) | **`48.00%`** | **`52.00%`** | `0.00%` | — | `10.00` | `32.00` | `0.00%` |
| **5P** (2H–2S–1N) | **`44.22%`** | **`46.45%`** | `9.32%` | `47.77%` | `7.69` | `30.18` | `1.27%` |
| **6P** (2H–2S–2N) | **`36.60%`** | **`40.30%`** | `23.10%` | `39.14%` | `6.56` | `30.29` | `4.32%` |
| **7P** (2H–2S–3N) | **`31.15%`** | **`43.00%`** | `25.85%` | `33.35%` | `5.23` | `29.11` | `6.98%` |
| **8P** (3H–3S–2N) | **`33.05%`** | **`38.98%`** | `27.98%` | `35.04%` | `7.01` | `39.35` | `5.13%` |

---

## 3. Phân tích Chuyên sâu 10 Chủ đề Cân bằng Đặc thù Phase 5E

### 3.1. `Ernest` (`exp1_ernest` — Hunter, 10 HP) — Burst / Disruption vs Glass-Cannon Risk
- **Số liệu S38:** `2,405` lượt xuất hiện, **`28.40%` win rate** ⚠️ (thấp nhất phe Hunter, ngang `Eleanor` `28.76%`), `25.82%` survival, `2,239` lần kích hoạt (`0.93/app`), ép lộ diện **`3,160` Shadow ẩn**, phá hủy **`1,990` trang bị Shadow**, và kích hoạt phản đòn `Umibozu` **`82` lần**.
- **Bot-meta vs Human Playtest:** Trong bot play, Ernest 10 HP tự trừ 2 HP xuống còn 8 HP ngay vòng 2–3 mà đồng đội Hunter bot không biết dồn sát thương tập trung vào các Shadow vừa bị lột sạch giáp; ngược lại Shadow bot quay sang bắn gục Ernest 8 HP ngay lập tức. Ở người chơi thật, việc lột sạch vũ khí (`Masamune`/`Machine Gun`) + ép lộ diện toàn bộ phe Shadow có giá trị chiến thuật khổng lồ — **không buff HP/kỹ năng Ernest trước khi có dữ liệu Human Playtest**.

### 3.2. `Usurper` (`exp2_usurper` — Shadow, 11 HP) — Heal Suppression
- **Số liệu S38:** `2,455` lượt xuất hiện, **`39.84%` win rate**, `37.27%` survival, `939` lần kích hoạt chủ động/ẩn (`743` pha ẩn vai lật chặn thành công), chặn tổng cộng **`9,393` HP hồi máu** (`3.83 HP/app`!).
- **Tác động lên phe hồi máu (`Elise`):** `Elise` thắng **`40.55%`** (`133/328`) khi gặp Usurper vs **`40.79%`** (`850/2,084`) khi không gặp Usurper — cho thấy cơ chế Usurper mang tính chiến thuật rõ rệt (ép đối thủ đợi hạ Usurper rồi mới tung kỹ năng hồi máu) mà không phá vỡ lối chơi của nhóm hồi máu.

### 3.3. `Angel` (`exp1_angel` — Neutral, 8 HP) — Immunity Aura & Church Victory
- **Số liệu S38:** `2,684` lượt xuất hiện, **`48.25%` win rate**, `60.39%` survival, `2,599` lần kích hoạt (`0.97/app`), chặn **`2,116` sát thương** (`0.79/app`).
- **Phân rã điều kiện thắng (`1,295` trận thắng):**
  - Toàn bộ Neutral còn sống (không đứng Church): **`862` trận (`66.6%`)**
  - Chỉ đứng chính xác `lobby` / Church (đã có Neutral chết): **`109` trận (`8.4%`)**
  - Thỏa cả hai điều kiện đồng thời: **`324` trận (`25.0%`)**
- **Đánh giá:** Lành mạnh hơn rõ rệt so với Classic `Allie` (`63.91%`) và `Bipolar` (`53.35%`), dù tỷ lệ thắng cao ở 5P (khi Angel là Neutral duy nhất) cần theo dõi trong Human Playtest.

### 3.4. `Bianca` (`exp2_bianca` — Neutral, 10 HP) — Stall Risk & Min-HP Victory
- **Số liệu S38:** `2,738` lượt xuất hiện, **`33.38%` win rate**, `67.79%` survival, `1,246` lần bỏ đồ vô hiệu hóa đòn đơn mục tiêu, chặn **`4,083` sát thương** (`1.49/app`).
- **Phân rã thắng (`914` trận):** **`734` trận thắng đơn HP thấp nhất (`80.3%`)** + **`180` trận thắng hòa min-HP (`19.7%`)**.
- **Kiểm chứng chống kéo dài trận (Zero Stall):** Trung bình số vòng khi có Bianca là **`6.73` vòng** vs **`7.38` vòng** khi vắng Bianca (không hề gây kéo dài trận vì đòn AoE `Wrath`/`Umibozu`/`Dynamite`/`Machine Gun` xuyên qua `Scrap Shield` kể cả khi chỉ có 1 nạn nhân!).

### 3.5. `Dalton` (`exp2_dalton` — Neutral, 13 HP) — Kill Win vs Max-HP Win 🚨 *(Outlier cần chú ý)*
- **Số liệu S38:** `2,618` lượt xuất hiện, **`50.73%` win rate** 🚨 (cao thứ 3 toàn bộ 12 Neutral, chỉ sau `Allie 63.91%` và `Bipolar 53.35%`), `66.54%` survival, `2,527` lần kích hoạt Vòng Đấu Thứ 12 (`0.97/app`), chặn `804` điểm tự hồi máu (`0.31/app`).
- **Phân rã thắng (`1,328` trận):**
  - **Thắng tức thì do hạ gục sau kích hoạt:** **`1,131` trận (`85.2%`)** 🚨
  - **Thắng cuối trận nhờ HP cao nhất:** **`197` trận (`14.8%`)**
- **Phân tích nguyên nhân gốc:** Dưới quy ước thử nghiệm **`<= 12` remaining HP** (`RC-15`), Dalton chỉ cần nhận đúng **1 sát thương** là lập tức kích hoạt Vòng Đấu Thứ 12 ở trạng thái gần đầy máu (`12/13 HP`), sau đó chỉ cần kết liễu bất kỳ ai là thắng solo ngay lập tức! Đây là tín hiệu cân bằng quan trọng nhất của Phase 5 — cần theo dõi đặc biệt ở Human Playtest để cân nhắc xem bản luật chính thức của Dalton có nên dùng ngưỡng `<= 12` remaining HP hay ngưỡng cao hơn (hoặc `12` wounds còn `1 HP` theo diễn giải còn lại của `RC-15`).

### 3.6. `Freyja` (`exp2_freyja` — Hunter, 12 HP) — Multi-Attack Burst
- **Số liệu S38:** `2,417` lượt xuất hiện, **`37.94%` win rate**, `39.80%` survival, **`3,073` đòn đánh thưởng** (`1.27/app`, tối đa `9` đòn thưởng trong 1 trận kéo dài nhiều lượt). Bám sát trung bình phe Hunter (`38.61%`), đánh đổi trang bị hợp lý, không tạo đột biến mất cân bằng.

### 3.7. `Warlord` (`exp2_warlord` — Shadow, 14 HP) — Pull & Bonus Attack
- **Số liệu S38:** `2,437` lượt xuất hiện, **`43.95%` win rate**, `43.91%` survival, **`2,378` lần kéo & đánh thưởng** (`0.98/app`). Trùng khít trung bình phe Shadow (`44.15%`), rất khỏe và công bằng.

### 3.8. `Gwendolen` (`exp1_gwendolen` — Hunter, 14 HP) — Cluster Deterrence & Privacy Rule
- **Số liệu S38:** `2,458` lượt xuất hiện, **`37.51%` win rate**, `39.95%` survival, **`1,486` đòn phản công** (`0.60/app` từ `1,628` prompt). Cân bằng vững chắc; quy tắc `preRevealed` (chỉ phản công cho Hunter/Neutral đã lộ diện) bảo vệ tuyệt đối bảo mật P0 mà vẫn giữ được mức win rate sát trung bình phe Hunter (`38.61%`).

### 3.9. `Umibozu` (`exp2_umibozu` — Shadow, 11 HP) — Reveal AoE Surge
- **Số liệu S38:** `2,392` lượt xuất hiện, **`40.38%` win rate**, `37.12%` survival, **`2,321` lần nổ sóng 3 ST** (`0.97/app`, tổng **`14,925` sát thương kỹ năng** = `6.24/app`, bao gồm `82` lần phản đòn khi bị Ernest ép lật vai!). Cân bằng rất tốt: sát thương diện rộng lớn nhưng HP 11 giữ tỷ lệ sống sót thấp (`37.12%`).

### 3.10. `Elise` (`exp2_elise`), `Arlene` (`exp2_arlene`), `Urban Legend` (`exp2_urban_legend`) & Xu hướng `G43`
- **`Elise` (Hunter, 10 HP):** **`40.75%` win rate**, `43.57%` survival, `2,052` lần kích hoạt (`0.85/app`), tổng **`8,395` HP hồi máu** (`3.48/app`) — hiệu suất rất lành mạnh, đứng trên trung bình Hunter dù chỉ có 10 HP.
- **`Arlene` (Neutral, 8 HP):** **`18.89%` win rate** (`481` trận thắng solo do Hunter hạ gục + `20` đồng thắng đồng thời), `3,066` lần ngụy trang thẻ Xanh tức thì (`1.16/app`). Giống `Eleanor`, hiệu suất bot thấp vì bot không biết đóng kịch giao tiếp bàn chơi để dụ Hunter kết liễu; dự kiến tăng lên `~25–35%` ở Human Playtest.
- **`Urban Legend` (Shadow, 11 HP):** **`42.05%` win rate**, `46.20%` survival, `1,836` lần chuyển hóa thẻ Đen, tổng **`2,709` HP hồi máu** (`1.10/app`) và `1.62` ST chặn/app — rất cân bằng.
- **Xu hướng dài hạn `G43` & `G43 + Holy Robe`:**
  - `G43` tổng thể: `S8 63.79% → S16 62.76% → S26 57.75% →` **`S38 55.64%`** (`-8.15%` tổng cộng từ S8!)
  - `G43 + Holy Robe`: `S8 70.10% → S16 68.76% → S26 69.16% →` **`S38 64.84%`** (`-4.32%` vs S26 — lần đầu tiên xuống dưới `65%`!)
  - `G43 vs Wrath`: **`40.12%`** (`329` trận đối đầu) — counterplay kỹ năng xuyên giáp tiếp tục phát huy cực mạnh.

---

## 4. Bảng Hiệu suất Đầy đủ 12 Nhân vật Wave 4 (`starter-thirty-eight`, 20,000 trận)

| Nhân vật | Nhóm | Phe | HP | Lượt | Win % | Survival % | Reveal % | Skill/App | Heal TB | Chặn ST TB | Bonus ST TB | Chặn Hồi TB | Phân loại |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Elise** (`exp2_elise`) | T2 | Hunter | 10 | 2,412 | **40.75%** | 43.57% | 97.18% | 0.85 | **3.48** | 0.00 | 0.00 | 0.00 | ✅ Rất cân bằng |
| **Freyja** (`exp2_freyja`) | T3 | Hunter | 12 | 2,417 | **37.94%** | 39.80% | 96.73% | 1.27 | 0.00 | 0.00 | 0.00 | 0.00 | ✅ Cân bằng tốt |
| **Gwendolen** (`exp1_gwendolen`) | T3 | Hunter | 14 | 2,458 | **37.51%** | 39.95% | 99.92% | 0.60 | 0.00 | 0.00 | 0.00 | 0.00 | ✅ Cân bằng tốt |
| **Ernest** (`exp1_ernest`) | T3 | Hunter | 10 | 2,405 | **28.40%** | 25.82% | 98.38% | 0.93 | 0.00 | 0.00 | 0.00 | 0.00 | ⚠️ Theo dõi playtest (bot-meta) |
| **Warlord** (`exp2_warlord`) | T3 | Shadow | 14 | 2,437 | **43.95%** | 43.91% | 98.73% | 0.98 | 0.00 | 0.00 | 0.00 | 0.00 | ✅ Rất cân bằng |
| **Urban Legend** (`exp2_urban_legend`) | T2 | Shadow | 11 | 2,459 | **42.05%** | 46.20% | 81.82% | 0.75 | 1.10 | 1.62 | 0.00 | 0.00 | ✅ Rất cân bằng |
| **Umibozu** (`exp2_umibozu`) | T2 | Shadow | 11 | 2,392 | **40.38%** | 37.12% | 99.50% | 0.97 | 0.00 | 0.00 | **6.24** | 0.00 | ✅ Cân bằng tốt |
| **Usurper** (`exp2_usurper`) | T3 | Shadow | 11 | 2,455 | **39.84%** | 37.27% | 96.70% | 0.38 | 0.00 | 0.00 | 0.00 | **3.83** | ✅ Cân bằng tốt |
| **Dalton** (`exp2_dalton`) | T3 | Neutral | 13 | 2,618 | **50.73%** | 66.54% | 96.52% | 0.97 | 0.00 | 0.00 | 0.00 | 0.31 | 🚨 Watchlist #1 (`RC-15` 12-HP) |
| **Angel** (`exp1_angel`) | T3 | Neutral | 8 | 2,684 | **48.25%** | 60.39% | 99.22% | 0.97 | 0.00 | 0.79 | 0.00 | 0.00 | ⚠️ Theo dõi 5P Human Playtest |
| **Bianca** (`exp2_bianca`) | T3 | Neutral | 10 | 2,738 | **33.38%** | 67.79% | 91.34% | 0.46 | 0.00 | 1.49 | 0.00 | 0.00 | ✅ Rất cân bằng (0 stall) |
| **Arlene** (`exp2_arlene`) | T2 | Neutral | 8 | 2,652 | **18.89%** | 45.89% | 57.43% | 1.16 | 0.00 | 0.00 | 0.00 | 0.00 | ℹ️ Bot-meta thấp (vai đánh lừa) |

*(Số liệu đầy đủ cho cả 36 vai Classic + Wave 1–3 còn lại trong pool 48 vai được lưu nguyên vẹn tại [`starter-thirty-eight-sim-data.json`](./starter-thirty-eight-sim-data.json), nổi bật: `G43 55.64%`, `Wrath 52.62%`, `Werewolf 51.92%`, `Allie 63.91%`, `Bipolar 53.35%`, `Eleanor 28.76%`.)*
