# Bóng Đêm KTX — Phase 7E 30,000-Match Full-Catalog Simulation & Balance Report (`starter-fifty-six`)

> **Nguồn dữ liệu:** Chạy thực tế `node scripts/sim-starter-fifty-six.cjs --write-json` (**30,000 trận deterministic**: `6,000` trận × `5` quy mô `4P–8P`, công thức seed `11_000_000 + playerCount * 100_000 + g + 1`, `simulatorVersion: "sim-s56-v2"`, `botPolicyVersion: "bot-policy-s56-v2"`, thời gian chạy `169,405 ms`). Bao phủ trọn bộ **66/66 nhân vật**, **34 loại Pending Choice**, lượt chiếm quyền Voodoo định tuyến theo controller, `TRANSFER_TO_BETHANY` và `SET_REACTION_PREF`.  
> **Dữ liệu thô đối chiếu:** [`starter-fifty-six-sim-data.json`](./starter-fifty-six-sim-data.json) (mọi chỉ số trong báo cáo này khớp 100% với tệp JSON gốc).  
> **Ghi nhận Lỗi Thực tế Đã Bắt & Vá Qua Mô phỏng (`sim-s56-v1 → sim-s56-v2`):** Lần chạy đầu `sim-s56-v1` phát hiện `138/30,000` trận bị treo (`0.46%`), từ đó phát hiện một **lỗi deadlock thực sự trên engine** khi Voodoo chiếm quyền lượt của `Felicia`/`Cruz`/`Gloria` (lá bài Trắng/Đen giữ lại sau `felicia_draw_choice` / `cruz_black_redraw` chưa được đồng bộ vào `publicDrawnCardIds`) cùng 2 lỗi bot policy (`isPubUdiProtected` chưa kiểm tra `copiedSkillRoleId === 'exp1_udi'` và fallback `Masamune`). Sau khi vá đồng bộ tại [`turn-ownership.ts`](../../../features/boardgame/domain/turn-ownership.ts) và [`actions.ts`](../../../features/boardgame/domain/actions.ts) (kèm test hồi quy trong [`boardgame-phase7d-integration.test.cjs`](../../../test/boardgame-phase7d-integration.test.cjs)), `sim-s56-v2` hoàn tất **30,000 / 30,000 trận với 0 treo ván, 0 hòa, 0 rò rỉ riêng tư, 0 vi phạm bảo toàn trang bị**.  
> **Lưu ý So sánh Cross-Wave & Chính sách Cân bằng (Section 26):** Do `bot-policy-s56-v2` bổ sung chiến lược riêng cho 8 vai Tier-4 và sửa xử lý kỹ năng sao chép, chênh lệch nhỏ so với `S48` (`bot-policy-s48-v2`) phản ánh đồng thời pool 66 nhân vật và bot policy mới. **Tuyệt đối không tự động buff/nerf bất kỳ nhân vật nào chỉ dựa trên dữ liệu bot.**

---

## 1. Tổng quan 7 Mốc Mở rộng (`Classic` → `S8` → `S16` → `S26` → `S38` → `S48` → **`S56 / Full 66`**)

| Chỉ số | Classic (4.5k) | S8 (10k) | S16 (10k) | S26 (15k) | S38 (20k) | S48 (25k) | **S56 (30,000)** | Đánh giá |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| **Pool nhân vật** | 10 (3/3/4) | 18 (7/7/4) | 26 (10/10/6) | 36 (14/14/8) | 48 (18/18/12) | 58 (19/18/21) | **66 (20H/21S/25N)** | ✅ Hoàn tất 100% Catalog |
| **Hoàn tất / Treo / Hòa** | 4.5k / 0 / 0 | 10k / 0 / 0 | 10k / 0 / 0 | 15k / 0 / 0 | 20k / 0 / 0 | 25k / 0 / 0 | **30,000 / 0 / 0** | ✅ 0 deadlock, 0 draw (`169.4s`) |
| **Vi phạm P0 / Trang bị** | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | **0 / 0** | ✅ Bảo toàn 100% |
| **Số vòng TB (`avgRounds`)** | `7.34` | `8.31` | `8.06` | `7.67` | `7.29` | `7.43` | **`7.56`** | ✅ Rất sát Classic (`+0.22`) |
| **Số lượt TB (`avgTurns`)** | `32.36` | `36.01` | `35.42` | `33.81` | `32.18` | `32.60` | **`33.19`** | ✅ Ổn định (`+0.59` vs S48) |
| **Chạm trần vòng (`reachedMaxRoundPct`)** | `0.20%` | `0.63%` | `0.59%` | `0.38%` | `0.26%` | `0.25%` | **`0.33%`** | ✅ Rất thấp dù có Lloyd + Undead |
| **Kết thúc sớm V1–V2 (`earlyEndRounds1To2Pct`)** | `2.02%` | `1.82%` | `1.59%` | `2.49%` | `3.54%` | `2.54%` | **`2.01%`** | ✅ Khớp khít Classic (`2.02%`) |
| **Tỷ lệ chết V1 / ghế (`round1PlayerDeathRatePct`)** | `0.448%` | `0.560%` | `0.430%` | `0.482%` | `0.671%` | `0.732%` | **`0.696%`** | ✅ Giảm nhẹ so với S48 |
| **Hạ gục TB / trận (`avgEliminationsPerGame`)** | `3.21` | `3.25` | `3.19` | `3.18` | `3.10` | `3.22` | **`3.22`** | ✅ Trùng khít Classic (`3.21`) |
| **Tổng sát thương TB / trận** | — | `68.75` | `67.89` | `65.84` | `63.16` | `64.54` | **`65.14`** | ✅ Không lạm phát sát thương |
| **Rút bài / Dùng bài TB / trận** | — | — | — | — | — | — | **`25.60` / `18.58`** | `768,061` rút · `557,510` dùng |
| **Hunter Primary (`lanternGuardPct`)** | `39.73%` | `49.81%` | `46.96%` | `41.34%` | `38.61%` | `42.00%` | **`40.93%`** | ✅ Rất gần Classic (`+1.20%`) |
| **Shadow Primary (`mistOrderPct`)** | `45.56%` | `36.20%` | `37.67%` | `42.81%` | `44.15%` | `46.98%` | **`47.07%`** | ✅ Gần Classic (`+1.51%`) |
| **Neutral Primary (`wandererPrimaryPct`)** | `14.71%` | `13.99%` | `15.37%` | `15.85%` | `17.25%` | `11.03%` | **`10.80%`** | ✅ Ổn định với pool 25 Neutral |
| **Multi-Faction (`multiFactionPct`)** | `0.00%` | `0.00%` | `0.00%` | `0.00%` | `0.00%` | `0.00%` | **`1.20%`** | `360` trận thắng song phe (Cain & đồng loại) |
| **Wanderer Win Rate 5P–8P** | `35.83%` | `35.59%` | `38.09%` | `35.92%` | `37.02%` | `38.52%` | **`34.99%`** | Solo `8.19%` + Co-win `26.80%` (`48,000` ghế) |
| **Tổng Pending Choices (`34` loại)** | `0` | `43,547` | `39,533` | `69,211` | `77,626` | `106,242` | **`151,867`** | `5.06` choices/trận (ước tính `17.71s`/trận ở mức `3.5s/choice`) |

### 1.1. Phân rã theo Quy mô Bàn (`4P–8P`, `6,000` trận/mốc)

| Quy mô | Hunter Win % | Shadow Win % | Neutral Primary % | Multi-Faction % | Neutral Role Win % | Avg Rounds | Avg Turns | Early End % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **4P** (`2H–2S–0N`) | **`48.62%`** | **`51.37%`** | `0.00%` | `0.02%` | — | `10.23` | `32.56` | `0.03%` |
| **5P** (`2H–2S–1N`, cấm N.C. Soldier) | **`44.00%`** | **`49.05%`** | `5.95%` | `1.00%` | `40.40%` | `7.95` | `30.99` | `0.75%` |
| **6P** (`2H–2S–2N`) | **`39.78%`** | **`44.78%`** | `14.18%` | `1.25%` | `36.90%` | `6.74` | `30.92` | `2.47%` |
| **7P** (`2H–2S–3N`) | **`34.92%`** | **`46.93%`** | `16.17%` | `1.98%` | `33.10%` | `5.56` | `30.47` | `4.08%` |
| **8P** (`3H–3S–2N`) | **`37.33%`** | **`43.22%`** | `17.70%` | `1.75%` | `33.20%` | `7.34` | `41.04` | `2.72%` |

- **Ghi chú `4P multiFactionPct = 0.02%`:** Xuất hiện đúng `1/6,000` trận khi đòn diện rộng/phản đòn loại đồng thời Hunter cuối và Shadow cuối trong cùng lô sự kiện — `MultiFactionVictory` ghi nhận song phe thắng chính xác thay vì bỏ sót một phe.
- **Khóa bàn 5P cho `exp2_nc_soldier`:** `ncSoldier5pDealtCheck = 0` trên toàn bộ `6,000` trận 5P.

### 1.2. Đối chiếu Toán học Toàn bộ 34 Loại Pending Choices & Telemetry Hệ thống

- **3 loại Phase 7 mới (`32,890`):** `lloyd_interrupt_attack` (`30,025`), `vengeful_spirit_copy_skill` (`2,568`), `voodoo_select_puppet` (`297` — ngoài ra bot Voodoo gửi trực tiếp `USE_SKILL` kèm `targetPlayerId`, tổng thực thi **`2,740`** lượt chiếm quyền và **`10,119`** hành động chiếm quyền).
- **9 loại Phase 6 (`21,910`):** `cassie_turn_heal` (`7,321`), `bethany_designate_chosen` (`3,896`), `gideon_draw_white` (`3,487`), `anathema_curse_target` (`1,823`), `clairvoyant_peek_copy` (`1,770`), `gideon_white_card_target` (`1,426`), `arnold_reflect_lethal` (`1,010`), `colt_theft_counter` (`736`), `colt_recover_or_damage` (`441`).
- **22 loại Wave 1–4 (`97,067`):** `fea_move_adjust` (`15,028`), `felicia_draw_choice` (`11,123`), `gayle_attack_reroll` (`10,362`), `wrath_turn_start_aoe` (`10,143`), `fiona_attack_roll` (`8,898`), `victor_blood_boost` (`6,851`), `freyja_extra_attack` (`5,144`), `cruz_black_redraw` (`3,937`), `elysia_counter_boost` (`3,464`), `visions_mark_target` (`3,216`), `elise_distribute_heal` (`2,910`), `gwendolen_counter_attack` (`2,472`), `bianca_discard_prevent` (`2,298`), `undying_reveal_reduce` (`2,076`), `bipolar_fate_coin` (`2,020`), `wendigo_reveal_heal` (`1,823`), `cindy_reveal_retaliate` (`1,467`), `urban_legend_reveal_heal` (`1,138`), `vengeance_chain_strike` (`1,042`), `usurper_reveal_block_heal` (`1,007`), `bryon_gift_equipment` (`648`), `warlord_pull_attack` (`0` — bot gọi `USE_SKILL` kèm `targetPlayerId` trực tiếp).
- **Tổng đối chiếu khớp tuyệt đối:** `32,890 + 21,910 + 97,067 = 151,867 === totalPendingChoicesResolved`.
- **Chỉ số ổn định hệ thống (Section 25):**
  - `choiceTimeoutsInFastBotSim = 0` (bot trả lời tức thì; alarm timeout + reconnect xác minh riêng trên DO thật trong `P7D-5`).
  - `reactionPolicyUsage` trên `180,000` ghế: `ASK = 173,674`, `AUTO_DECLINE = 2,220`, `AUTO_ACTIVATE_WHEN_ELIGIBLE = 4,106`.
  - `maxRedirectChainDepthObserved = 2`, `maxCopyDepthObserved = 2`, `copiedSkillActivationsTotal = 697`, `copiedVictoryLinksBoundTotal = 11,643`, `victoryCyclesDetectedOrganic = 0`.
  - `totalEquipmentTheftsObserved = 54,345`, `totalEquipmentRecoveriesObserved = 364`, `equipmentConservationViolations = 0`.
  - `unauthorizedControlAttemptsRejected = 113` (kiểm tra thăm dò định kỳ trên lượt bị chiếm quyền), `botAccessViolations = 0`.
- **Kiểm chứng Vi kịch bản Tách biệt (`targetedMechanicsValidation` — không trộn vào 30,000 trận ngẫu nhiên):**
  - `threeNodeCycleDetectedCount = 3`, `threeNodeCycleFailClosedPass = true`
  - `ncSoldierAlliance3WeaponWinPass = true`
  - `voodooUnauthorizedProbesAllRejected = true`

---

## 2. Phân tích Chi tiết 8 Nhân vật Tier-4 Mới (`Wave 6 · Phase 7`)

| Role ID | Nhân vật | Phe | HP | Xuất hiện | Win % | Sống % | Lộ diện % | Kích hoạt / app | Telemetry Đặc thù (30,000 trận) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| `exp1_lloyd` | **Lloyd** | Hunter | 12 | `3,307` | **`36.92%`** | `17.78%` | `99.30%` | `4.51` | `30,025` lời nhắc → **`14,925`** đòn bị hủy, **`2,017`** pha hy sinh HP cuối |
| `exp1_vengeful_spirit` | **Vengeful Spirit** | Shadow | 13 | `3,045` | **`44.50%`** | `38.95%` | `99.64%` | `0.83` | `2,568` lời nhắc kín → **`2,516`** lần sao chép kỹ năng (`maxCopyDepth = 2`) |
| `exp1_voodoo` | **Voodoo** | Shadow | 13 | `3,184` | **`46.58%`** | `41.02%` | `99.28%` | `1.00` | **`2,740`** lượt chiếm quyền (`10,119` lệnh), `113` thăm dò trái phép bị chặn, `0` leak |
| `exp1_undead` | **Undead** | Shadow | 11 | `3,127` | **`53.02%`** ⚠️ | `55.42%` | `70.64%` | `0.65` | **`2,037`** lần ngủ đông → **`1,965`** lần hồi sinh 6 HP → **`759`** trận thắng sau hồi sinh |
| `exp1_antimony` | **Antimony** | Neutral | 8 | `1,949` | **`16.32%`** | `49.36%` | `99.33%` | `0.81` | **`1,583`** lần sao chép bắt buộc → **`318`** chiến thắng theo `COPY_GOAL` |
| `exp2_cain` | **Cain** | Neutral | 11 | `1,858` | **`24.00%`** | `82.35%` | `97.20%` | `0.96` | **`1,786`** kích hoạt (`avgHeal = 2.34`), **`446`** thắng cá nhân, **`360`** trận thắng song phe |
| `exp2_bonnie` | **Bonnie** | Neutral | 10 | `1,938` | **`9.80%`** 🚨 | `43.76%` | `64.60%` | `0.23` | **`445`** lần chuyển sang Shadow (`22.96%` xuất hiện) → **`190`** thắng sau chuyển phe (`42.7%` khi đã chuyển), `0` thắng khi chưa chuyển |
| `exp2_nc_soldier` | **N.C. Soldier** | Neutral | 13 | `1,708` | **`0.88%`** 🚨 | `60.42%` | `99.30%` | `0.31` | **`1,212`** lượt Chiêu Mộ → **`529`** chiêu mộ thành công → **`15`** chiến thắng liên minh 3 vũ khí (`0` trận chia ở 5P) |

### Đánh giá 8 Chủ đề Cân bằng Tier-4 (Section 26)

1. **Lloyd (Hủy đòn toàn bàn lặp lại):** Hủy `14,925` đòn (`4.51/app`, kèm `2,017` pha hy sinh 1–2 HP cuối) nhưng **không** làm kéo dài ván đấu bất thường (`avgRounds` chỉ tăng `+0.13` so với S48) và **không** áp đảo (`36.92%` thấp hơn TB Hunter `40.93%`) vì chi phí 2 HP/lần khiến tỷ lệ sống của Lloyd chỉ `17.78%`. *Cần theo dõi Human Beta:* người chơi thật có dùng Lloyd chọn lọc hơn (chỉ chặn đòn chí tử / Súng Máy) để đẩy win rate lên mức `42–48%` hay không.
2. **Voodoo (Chiếm quyền lượt):** Đạt **`46.58%`** — gần như trùng khớp trung bình phe Shadow (`47.07%`), kích hoạt đều (`1.00/app`, `2,740` lượt chiếm quyền, `10,119` hành động công khai) mà không tạo bất lợi mất kiểm soát hay làm tăng tốc độ loại vòng 1. *Cần theo dõi Human Beta:* mức độ rõ ràng UX khi tạm dừng quyền điều khiển vì lá Điều tra (`pausedForOwnerDecision`).
3. **Undead (Ngủ đông & Hồi sinh 6 HP) ⚠️:** Đạt **`53.02%`** (`+5.95%` so với TB Shadow `47.07%`, đứng top 3 Shadow sau `Wrath 57.81%` và `Dũng 57.89%`). Lợi thế đến từ tổng ngưỡng chịu đòn hiệu dụng `11 + 6 = 17 HP`, miễn nhắm mục tiêu trong khoảng ngủ đông, và ngăn Hunter kết thúc trận sớm khi Undead là Shadow cuối. *Ưu tiên cao Human Beta:* theo dõi xem người chơi thật có phối hợp dồn sát thương kết liễu ngay sau lượt Undead hồi sinh 6 HP hay không.
4. **Vengeful Spirit (Sao chép kỹ năng sau tử vong):** Đạt **`44.50%`** (`2,516` bản sao từ `2,568` lời nhắc kín, `697` lần kích hoạt kỹ năng sao chép chung với Antimony, `maxCopyDepth = 2`) — hoàn toàn cân bằng, không phát sinh đột biến sức mạnh vượt trội.
5. **Antimony (Sao chép kỹ năng + `COPY_GOAL`):** Đạt **`16.32%`** (`318` thắng từ `1,583` lần sao chép). Tỷ lệ thắng thấp hơn trung bình Neutral (`34.99%`) do 8 HP rất mỏng và bắt buộc sao chép người chết đầu tiên (thường thuộc phe đang thất thế hoặc Neutral có điều kiện khó).
6. **Cain (Thắng song phe & Thắng cá nhân):** Sống sót rất cao (`82.35%`) nhờ kỹ năng hồi máu (`avgHeal = 2.34 HP/app`), kích hoạt **`360`** trận thắng song phe (`1.20%` tổng số trận) khi bị hạ gục, và đạt **`24.00%`** (`446`) thắng cá nhân. Trên bàn người thật, hiệu ứng răn đe *"đừng giết Cain kẻo cả hai phe cùng thắng"* sẽ tạo động lực chính trị rất khác bot.
7. **Bonnie (Chuyển phe Shadow khi kết liễu Shadow) 🚨:** Chỉ **`9.80%`** tổng thể vì bot chỉ chuyển phe thành công `445 / 1,938` (`22.96%`), dù **khi đã chuyển phe thành công thì thắng `190 / 445 = 42.70%`** (rất sát TB Shadow!). Khó khăn cốt lõi là giành đúng **đòn kết liễu cuối cùng** lên một Shadow.
8. **N.C. Soldier (Chiêu mộ Neutral & 3 Vũ khí liên minh) 🚨 *(Outlier thấp nhất catalog)*:** Chiêu mộ hoạt động thực sự (`1,212` lượt đánh chiêu mộ → `529` Neutral gia nhập liên minh), nhưng tỷ lệ thắng chỉ **`0.88%` (`15/1,708`)** vì giao điểm của 2 điều kiện cực gắt cùng lúc: (a) chiêu mộ đủ mọi Neutral khác chia ban đầu còn sống/chưa đổi phe VÀ (b) thủ lĩnh tự cầm đủ đúng 3 lá vũ khí Đen 1 bản sao (`ev-06`, `ev-05`, `ev-03`). Đã xác minh đường thắng hoạt động chính xác 100% ở cả 15 trận ngẫu nhiên lẫn `targetedMechanicsValidation`. **Giữ nguyên luật trong Phase 7, ưu tiên đánh giá trong Human Beta.**

---

## 3. Tái đánh giá 8 Outlier Từ Các Phase Trước (Section 26)

| Hạng mục Outlier | S48 (25k · `bot-policy-s48-v2`) | **S56 (30k · `bot-policy-s56-v2`)** | Xu hướng & Nhận định (Không tự động chỉnh luật) |
|---|---:|---:|---|
| **`Anathema`** 🚨 | `79.41%` (`1,991` app) | **`81.08%`** (`1,956` app · `8,708` ST chuyển) | Tăng nhẹ `+1.67%`; tiếp tục là outlier cao nhất ở bot-meta do bot không phối hợp bắn xuyên Anathema để hạ nạn nhân bị nguyền. **Ưu tiên #1 Human Beta.** |
| **`Colt`** 🚨 | `7.18%` (`1,951` app) | **`8.50%`** (`1,882` app · `364` thu hồi · `160` thắng) | Tăng nhẹ `+1.32%`, vẫn rất thấp do chỉ có 4 bản sao vũ khí chuẩn trong bộ bài Đen. **Ưu tiên cao Human Beta.** |
| **`Bethany`** ⚠️ | `56.39%` (`1,917` app) | **`56.56%`** (`1,950` app · `1,103` đồng thắng · `347` thắng khi chết) | Ổn định gần như không đổi (`+0.17%`); `31.5%` chiến thắng diễn ra sau khi Bethany đã bị loại. |
| **`G43` / `+ Holy Robe` / `vs Wrath`** ⚠️ | `60.94%` / `70.28%` / `50.70%` | **`63.07%` / `73.64%` / `49.33%`** (`3,236` / `789` / `373` app) | G43 + Holy Robe tăng `+3.36%` khi có thêm Lloyd bảo vệ đòn thường; Wrath vẫn giữ đối trọng tốt (`49.33%`). **Ưu tiên cao Human Beta.** |
| **`Dalton`** (`RC-15`) | `46.89%` (`747` kill / `150` full HP) | **`47.64%`** (`1,948` app · `770` kill / `158` high-HP) | Ổn định (`+0.75%`); câu hỏi rãnh vết thương `RC-15` tiếp tục giữ mở chờ xác minh luật gốc + Human Beta. |
| **`Wrath`** ⚠️ | `55.95%` | **`57.81%`** (`3,221` app · `9.14` ST thưởng/app) | Tăng `+1.86%`; AoE xuyên giáp không bị Lloyd ngắt vẫn là nguồn sát thương dẫn đầu phe Shadow. |
| **`Cindy 5P` & `Angel 5P`** ⚠️ | `71.60%` & `63.44%` | **`69.44%`** (`175/252`) & **`69.69%`** (`177/254`) | Cả hai duy trì tỷ lệ thắng cao ở 5P (tổng thể `Cindy 37.57%`, `Angel 50.10%`); bàn 5P có thêm biến động do bỏ N.C. Soldier khỏi pool 5P. |
| **`Cassie` & `Diana`** | `25.45%` & `17.66%` | **`23.52%`** (`1,371` liên kết) & **`18.94%`** (`323` co-win + `44` full HP) | Ổn định ở vùng thấp vì bàn 5P thiếu Neutral thứ 2 và pool 25 Neutral có thêm nhiều mục tiêu khó (`N.C. Soldier`, `Bonnie`, `Antimony`). |

---

## 4. Lệnh Tái lập Mô phỏng

```bash
node scripts/sim-starter-fifty-six.cjs --write-json
```
