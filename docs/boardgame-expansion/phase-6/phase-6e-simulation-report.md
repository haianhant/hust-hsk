# Bóng Đêm KTX — Phase 6E 25,000-Match Simulation & Balance Report (`starter-forty-eight`)

> **Nguồn dữ liệu:** Chạy thực tế `node scripts/sim-starter-forty-eight.cjs --write-json` (**25,000 trận deterministic**: `5,000` trận × `5` quy mô `4P–8P`, bộ seed `10_000_000 + playerCount * 100_000 + g + 1`, `simulatorVersion: "sim-s48-v1"`, `botPolicyVersion: "bot-policy-s48-v2"`). Bao phủ đủ **58 vai trò**, **31 loại Pending Choice**, hành động `TRANSFER_TO_BETHANY` và `SET_REACTION_PREF`. Dữ liệu thô: [`starter-forty-eight-sim-data.json`](./starter-forty-eight-sim-data.json).  
> **Lưu ý So sánh Cross-Wave:** Mỗi wave sử dụng phiên bản bot policy mở rộng theo các cơ chế mới của wave đó (`bot-policy-s48-v2` bổ sung nhận diện `Bethany`, `Diana`, `Aaron`, `April & Skipps`, `Colt`, `Anathema`, `Gideon`, `Clairvoyant`, `Cassie`), nên biến động nhỏ giữa S38 và S48 phản ánh cả tác động pool mới lẫn chiến lược bot mới.  
> **Nguyên tắc cân bằng (Section 30):** **Tuyệt đối không tự động buff/nerf** bất kỳ nhân vật nào chỉ dựa trên dữ liệu bot. Mọi outlier được ghi nhận trung thực kèm giả thuyết riêng cho **Human Playtest**.

---

## 1. Tổng quan 6 Mốc Mở rộng (`Classic` → `S8` → `S16` → `S26` → `S38` → **`S48`**)

| Chỉ số | Classic (4.5k) | S8 (10k) | S16 (10k) | S26 (15k) | S38 (20k) | **S48 (25,000)** | Đánh giá |
|---|---:|---:|---:|---:|---:|---:|---|
| **Pool nhân vật** | 10 (3/3/4) | 18 (7/7/4) | 26 (10/10/6) | 36 (14/14/8) | 48 (18/18/12) | **58 (19H/18S/21N)** | ✅ Hoàn tất 100% Tier-3 |
| **Hoàn tất / Treo / Hòa** | 4.5k / 0 / 0 | 10k / 0 / 0 | 10k / 0 / 0 | 15k / 0 / 0 | 20k / 0 / 0 | **25,000 / 0 / 0** | ✅ 0 deadlock, 0 draw (`90.0s`) |
| **Vi phạm P0 (`botAccessViolations`)** | 0 | 0 | 0 | 0 | 0 | **0** | ✅ Zero payload leak |
| **Số vòng TB (`avgRounds`)** | `7.34` | `8.31` | `8.06` | `7.67` | `7.29` | **`7.43`** | ✅ Rất sát Classic (`+0.09`) |
| **Số lượt TB (`avgTurns`)** | `32.36` | `36.01` | `35.42` | `33.81` | `32.18` | **`32.60`** | ✅ Rất sát Classic (`+0.24`) |
| **Chạm trần vòng (`reachedMaxRoundPct`)** | `0.20%` | `0.63%` | `0.59%` | `0.38%` | `0.26%` | **`0.25%`** | ✅ Thấp ổn định |
| **Kết thúc sớm V1–V2 (`earlyEndRounds1To2Pct`)** | `2.02%` | `1.82%` | `1.59%` | `2.49%` | `3.54%` | **`2.54%`** | ✅ Giảm `-1.00%` vs S38 (ít Dalton/Arlene hơn khi Neutral pool tăng lên 21) |
| **Tỷ lệ chết V1 / ghế (`round1PlayerDeathRatePct`)** | `0.448%` | `0.560%` | `0.430%` | `0.482%` | `0.671%` | **`0.732%`** | ⚠️ Theo dõi nhẹ trong playtest |
| **Hạ gục TB / trận (`avgEliminationsPerGame`)** | `3.21` | `3.25` | `3.19` | `3.18` | `3.10` | **`3.22`** | ✅ Trùng khít Classic (`3.21`) |
| **Tổng sát thương TB / trận** | — | `68.75` | `67.89` | `65.84` | `63.16` | **`64.54`** | ✅ Không lạm phát sát thương |
| **Hunter Primary (`lanternGuardPct`)** | `39.73%` | `49.81%` | `46.96%` | `41.34%` | `38.61%` | **`42.00%`** | ✅ Cải thiện gần Classic (`+2.27%`) |
| **Shadow Primary (`mistOrderPct`)** | `45.56%` | `36.20%` | `37.67%` | `42.81%` | `44.15%` | **`46.98%`** | ✅ Gần Classic (`+1.42%`) |
| **Neutral Primary (`wandererPrimaryPct`)** | `14.71%` | `13.99%` | `15.37%` | `15.85%` | `17.25%` | **`11.03%`** | ✅ Giảm solo rush vì 9 Neutral mới chủ yếu co-win / survival |
| **Wanderer Win Rate 5P–8P** | `35.83%` | `35.59%` | `38.09%` | `35.92%` | `37.02%` | **`38.52%`** | ✅ Solo `8.67%` + Co-win `29.85%` (40,000 lượt Neutral) |
| **Tổng Pending Choices (`31` loại)** | `0` | `43,547` | `39,533` | `69,211` | `77,626` | **`106,242`** | ✅ `4.25` choices/trận (ước tính `~14.88s` chờ/trận ở mức `3.5s/choice`) |

### 1.1. Phân rã theo Quy mô Bàn (`4P–8P`, 5,000 trận/mốc)

| Quy mô | Hunter Win % | Shadow Win % | Neutral Primary % | Neutral Role Win % | Avg Rounds | Avg Turns | Early End % |
|---|---:|---:|---:|---:|---:|---:|---:|
| **4P** (2H–2S–0N) | **`49.60%`** | **`50.40%`** | `0.00%` | — | `10.02` | `31.89` | `0.04%` |
| **5P** (2H–2S–1N) | **`45.16%`** | **`48.10%`** | `6.74%` | `43.44%` | `7.85` | `30.59` | `1.06%` |
| **6P** (2H–2S–2N) | **`41.48%`** | **`44.08%`** | `14.44%` | `40.86%` | `6.64` | `30.48` | `3.26%` |
| **7P** (2H–2S–3N) | **`35.28%`** | **`48.66%`** | `16.06%` | `37.29%` | `5.43` | `29.78` | `4.86%` |
| **8P** (3H–3S–2N) | **`38.46%`** | **`43.64%`** | `17.90%` | `35.58%` | `7.23` | `40.27` | `3.50%` |

- **Điểm sáng 4P:** `49.60% Hunter / 50.40% Shadow` trên 5,000 trận — độ cân bằng hai phe gần như hoàn hảo (`±0.40%`).

### 1.2. Đối chiếu Toán học 31 Loại Pending Choices (`totalPendingChoicesResolved = 106,242`)

- **9 loại Phase 6 mới:** `cassie_turn_heal` (`7,413`), `bethany_designate_chosen` (`3,790`), `gideon_draw_white` (`2,867`), `anathema_curse_target` (`1,844`), `clairvoyant_peek_copy` (`1,729`), `gideon_white_card_target` (`1,233`), `arnold_reflect_lethal` (`1,007`), `colt_theft_counter` (`789`), `colt_recover_or_damage` (`439`) → tổng phụ Wave 5 = **`21,111`**.
- **22 loại Wave 1–4:** `fea_move_adjust` (`12,380`), `wrath_turn_start_aoe` (`9,491`), `felicia_draw_choice` (`9,378`), `gayle_attack_reroll` (`8,665`), `fiona_attack_roll` (`7,318`), `victor_blood_boost` (`6,688`), `freyja_extra_attack` (`4,231`), `cruz_black_redraw` (`3,767`), `visions_mark_target` (`3,120`), `elysia_counter_boost` (`2,840`), `elise_distribute_heal` (`2,542`), `bianca_discard_prevent` (`2,129`), `undying_reveal_reduce` (`1,968`), `bipolar_fate_coin` (`1,910`), `gwendolen_counter_attack` (`1,885`), `wendigo_reveal_heal` (`1,689`), `cindy_reveal_retaliate` (`1,382`), `urban_legend_reveal_heal` (`1,074`), `vengeance_chain_strike` (`996`), `usurper_reveal_block_heal` (`993`), `bryon_gift_equipment` (`685`), `warlord_pull_attack` (`0` — bot gọi `USE_SKILL` kèm `targetPlayerId` trực tiếp) → tổng phụ Wave 1–4 = **`85,131`**.
- **Tổng khớp tuyệt đối:** `21,111 + 85,131 = 106,242 === totalPendingChoicesResolved`.
- **Giao dịch trang bị & Reaction Policy:** `44,982` lượt cướp trang bị quan sát được, `370` lượt thu hồi nguyên tử của Colt, `1,519` lượt `TRANSFER_TO_BETHANY` tự nguyện; `SET_REACTION_PREF` trên `150,000` ghế (`ASK = 143,844`, `AUTO_DECLINE = 2,144`, `AUTO_ACTIVATE_WHEN_ELIGIBLE = 4,012`). `choiceTimeoutsInFastBotSim = 0` (bot trả lời tức thì; alarm timeout & reconnect được xác minh riêng trên DO thật trong `P6D-5`).

---

## 2. Bảng Hiệu suất 10 Nhân vật Phase 6 (`Wave 5 · Tier-3 Completion`)

| Role ID | Nhân vật | Phe | HP | Xuất hiện | Win % | Sống % | Lộ diện % | Kích hoạt / app | Dữ liệu Đặc thù |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| `exp2_gideon` | Gideon | Hunter | 14 | `2,921` | **`44.06%`** | `43.68%` | `99.35%` | `0.98` | `2,867` kích hoạt, **`4,658`** thẻ Trắng đã rút/dùng (`max 9`/trận) |
| `exp1_anathema` | Anathema | Neutral | 8 | `1,991` | **`79.41%`** 🚨 | `79.41%` | `99.05%` | `0.93` | `1,844` lần nguyền, **`8,994`** ST chuyển hướng (`4.52/app`), `1,838` tự trừ 1 HP |
| `exp1_bethany` | Bethany | Neutral | 10 | `1,917` | **`56.39%`** ⚠️ | `55.82%` | `99.69%` | `2.09` | `4,007` chỉ định, `1,519` nhận đồ từ người khác; `1,081` đồng thắng (`342` thắng khi đã chết) |
| `exp1_arnold` | Arnold | Neutral | 8 | `1,847` | **`52.52%`** ⚠️ | `63.94%` | `59.88%` | `0.55` | `1,007` phản đòn chí mạng, **`3,197`** ST phản lại (`1.73/app`), `970` thắng (`>2` người sống) |
| `exp1_cassie` | Cassie | Neutral | 11 | `1,945` | **`25.45%`** | `75.32%` | `99.43%` | `3.60` | `7,006` lượt hồi máu (**`6,950` HP**), `1,409` liên kết `COPY_GOAL` |
| `exp1_clairvoyant` | Clairvoyant | Neutral | 11 | `1,891` | **`42.89%`** | `58.49%` | `99.95%` | `0.91` | `1,729` lượt soi kín & sao chép mục tiêu thắng (`COPY_GOAL`) |
| `exp2_april_skipps` | April & Skipps | Neutral | 8 | `1,901` | **`46.55%`** | `50.24%` | `62.91%` | `0.30` | `575` kích hoạt ô 7 (`180` thắng lượt sau + `705` thắng ẩn cuối trận) |
| `exp2_colt` | Colt | Neutral | 11 | `1,951` | **`7.18%`** 🚨 | `58.38%` | `99.59%` | `0.40` | `789` phản công cướp đồ (`370` đòi lại đồ, `69` gây ST), `140` thắng 3 vũ khí |
| `exp2_diana` | Diana | Neutral | 13 | `1,948` | **`17.66%`** | `63.71%` | `74.79%` | `0.58` | `1,335` gắn khách hàng (`1,131` kích hoạt); `301` đồng thắng + `43` thắng đầy máu |
| `exp2_aaron` | Aaron | Neutral | 8 | `1,827` | **`32.29%`** | `48.88%` | `95.24%` | `0.85` | `1,561` gắn vợ (`414` đôi cùng sống + `176` chưa vợ chết trước hết trận) |

---

## 3. Phân tích Cân bằng Chuyên sâu (Section 30 — Không Tự Động Rebalance)

### 3.1. `CopiedVictoryGraph` (`Bethany`, `Cassie`, `Clairvoyant`, `Diana`, `Aaron`)
- **Liên kết & Đồng thắng:** Tổng cộng **`9,837` liên kết chiến thắng** đã được gắn kết trong 25,000 trận (`1,382` lượt đồng thắng `SHARE_OUTCOME` / `CONDITIONAL_SHARED` từ Bethany `1,081` + Diana `301`).
- **Tạo chiến thắng quá dễ hay không?**
  - `Clairvoyant` (`42.89%`) rất cân bằng vì `COPY_GOAL` buộc phải hoàn thành mục tiêu bằng trạng thái bản thân (không ăn theo).
  - `Cassie` (`25.45%`) và `Diana` (`17.66%`) ở mức thấp hơn trung bình Neutral (`38.52%`) vì ở bàn 5P (1 Neutral) không có Neutral khác để gắn kết, đồng thời nhiều Neutral có điều kiện thắng cá nhân khó hoàn thành với trạng thái của Cassie (`Bob 5 đồ`, `Colt 3 vũ khí`, `Charles`).
  - `Bethany` (`56.39%`, trong đó `342/1,081 = 31.6%` là thắng sau khi đã bị loại) ở mức cao ⚠️ vì `SHARE_OUTCOME` không yêu cầu Bethany sống sót và người chơi khác sẵn sàng tặng trang bị thừa để biến mình thành Chosen.
- **Chu trình & Kết thúc sớm:** `victoryCyclesDetectedOrganic = 0` trên 25,000 trận ngẫu nhiên (kịch bản chu trình 3 nút được xác minh riêng trong `targetedMechanicsValidation`: `threeNodeCycleDetectedCount = 3`, `threeNodeCycleFailClosedPass = true`); tỷ lệ kết thúc sớm V1–V2 thực tế **giảm** từ `3.54%` (S38) xuống `2.54%` (S48).
- **Giả thuyết Human Playtest:** Kiểm tra xem người chơi thật có chủ động đổi `Chosen` của Bethany qua `TRANSFER_TO_BETHANY` vào giai đoạn cuối trận hay không, và liệu tỷ lệ thắng `~56%` của Bethany có cần yêu cầu Bethany còn sống ở phiên bản luật sau hay không.

### 3.2. `Anathema` + `Arnold` (Damage Redirection) 🚨 *(Outlier #1 cần theo dõi đặc biệt)*
- **Số liệu:** `Anathema` đạt **`79.41%` win rate** (`8,994` sát thương chuyển hướng = `4.52 dmg/app`, `0` trận chết trong lúc còn nguyền nếu mục tiêu sống); `Arnold` đạt **`52.52%` win rate** (`1,007` lần phản chí mạng = `3,197` ST phản lại, giữ nguyên HP); chuỗi chuyển hướng thực tế trong pool ngẫu nhiên đạt **`maxRedirectChainDepthObserved = 2`** (`Attacker → Anathema → Arnold → Attacker`), luôn chấm dứt an toàn.
- **Nguyên nhân gốc ở bot-meta:** Anathema thắng đơn thuần bằng cách **sống sót đến cuối trận** (như Allie `65.42%`) nhưng lại có thể gắn lời nguyền chuyển 100% sát thương sang người chơi nhiều máu nhất (vd. `G43` hoặc `Dũng`). Bot không biết phối hợp "tập trung hạ mục tiêu bị nguyền trước rồi mới giết Anathema", khiến Anathema gần như bất tử trước bot!
- **Giả thuyết Human Playtest:** Trong bàn người thật, ngay khi Anathema lộ diện nguyền 1 đồng minh của phe đối lập, phe kia sẽ cố ý dồn sát thương vào Anathema để **bắn gián tiếp chết nạn nhân bị nguyền** (xuyên giáp tầm đánh/vị trí!). Cần đo thực tế win rate Anathema với người thật trước khi xem xét bất kỳ chỉnh sửa luật nào.

### 3.3. `Colt` (`exp2_colt`) 🚨 *(Outlier thấp nhất — `7.18%`)*
- **Số liệu:** Chỉ **`140 / 1,951` (`7.18%`)** đạt thắng 3 vũ khí chuẩn (`ev-02..ev-05`), dù kỹ năng phản công cướp đồ kích hoạt khỏe (`789` lần, thu hồi đúng món đồ `370` lần so với `69` lần chọn gây sát thương).
- **Nguyên nhân gốc:** Trong bộ bài Đen 16 lá chỉ có đúng **4 bản sao duy nhất** (`ev-02`, `ev-03`, `ev-04`, `ev-05`); thu thập đủ 3/4 lá trong vòng ~7.4 vòng đòi hỏi vừa rút bài Đen liên tục vừa cướp tại `court` mà không bị người chơi khác giữ mất.
- **Giả thuyết Human Playtest:** Kiểm tra xem người thật dùng chiến thuật cướp đồ tập trung (`court` + `ev-11` + thương lượng đổi đồ) có nâng win rate Colt lên vùng `18–25%` hay không, hoặc có cần mở rộng danh sách vũ khí hợp lệ ở bản cân bằng tương lai.

### 3.4. `Gideon` (`exp2_gideon`)
- **Số liệu:** **`44.06%` win rate** (`+2.06%` so với trung bình Hunter `42.00%`), `2,867` lần kích hoạt, rút & giải quyết tuần tự **`4,658` thẻ Trắng**, tối đa **`9` thẻ Trắng trong một trận** (khi 3 Shadow bị hạ ở bàn 8P).
- **Đánh giá:** Hoàn toàn **không gây lạm phát vô hạn** (trung bình chỉ `1.59` thẻ Trắng rút thêm mỗi lần xuất hiện) và nằm gọn trong dải cân bằng Hunter (`33%–46%`, thấp hơn rõ rệt so với `G43` `60.94%`).

### 3.5. `April & Skipps` (`exp2_april_skipps`)
- **Số liệu:** **`46.55%` win rate** (`575` lần chạm đúng ô 7 vết thương ≈ `30.2%` số trận xuất hiện!). Trong `885` trận thắng: **`180` trận (`20.3%`) thắng bằng sống sót qua lượt kế tiếp sau mốc 7** và **`705` trận (`79.7%`) thắng nhờ giữ ẩn vai đến cuối trận**.
- **Đánh giá:** Tỷ lệ kích hoạt `30.2%` và tỷ lệ chuyển hóa sống sót sau khi lộ ở 1 HP (`180 / 575 = 31.3%`) cực kỳ kịch tính và hợp lý — đúng tinh thần "bị phát hiện!! chạy ngay!".

### 3.6. Theo dõi Tiếp nối Các Outlier Đợt Trước (Previous Outliers)
- **`Dalton`:** **`46.89%`** (giảm nhẹ từ `50.73%` ở S38; vẫn chủ yếu thắng hạ gục `747` vs `150` đầy máu — tiếp tục ưu tiên kiểm tra `RC-15` ở Human Playtest).
- **`G43` & `G43 + Holy Robe`:** **`60.94%`** tổng thể / **`70.28%`** với Holy Robe / **`50.70%`** khi gặp Wrath (tăng trở lại nhẹ so với S38 `55.64%` / `64.84%` do phe Hunter nói chung mạnh lên từ `38.61% → 42.00%` và Gideon buff bài Trắng cho đội hình Hunter).
- **`Wrath`:** **`55.95%`** (dẫn đầu phe Shadow — AoE xuyên giáp tiếp tục có giá trị cao trong meta có nhiều Neutral/G43).
- **`Cindy 5P` & `Angel 5P`:** `Cindy` tổng thể **`39.12%`** nhưng ở bàn **5P** đạt **`71.60%`** (`184/257`); `Angel` tổng thể **`48.61%`** và ở **5P** đạt **`63.44%`** (`144/227`) — cả hai đều mạnh ở 5P (1 Neutral) do điều kiện sống sót/không bị áp lực Neutral khác.
- **`Bipolar`:** **`56.47%`** (ổn định so với `53.35%` ở S38).
- **`Ernest` (`32.54%`) & `Eleanor` (`33.13%`):** Đều tăng khoảng `+4.1%` đến `+4.4%` so với S38 (`28.40%` / `28.76%`), bám sát hơn với trung bình phe Hunter.
