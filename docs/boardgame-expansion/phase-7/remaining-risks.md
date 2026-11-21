# Bóng Đêm KTX — Phase 7 Remaining Risks, Open Rule Questions & Residual Security Notes

> Tài liệu tổng hợp trung thực toàn bộ rủi ro kỹ thuật, bảo mật, cân bằng và câu hỏi luật gốc còn tồn đọng sau khi hoàn thiện 66/66 nhân vật ở Phase 7. Không che giấu bất kỳ giới hạn nào.

---

## 1. Rủi ro Bảo mật & Quyền riêng tư (Residual Risks)

| Mức độ | Hạng mục | Hiện trạng sau Phase 7 | Biện pháp Theo dõi / Giảm thiểu |
|---|---|---|---|
| **P0 (Đã giải quyết 100%)** | Rò rỉ payload vai ẩn, chiếm quyền lượt trái phép, leo thang đặc quyền Voodoo, deadlock Voodoo + Felicia/Cruz/Gloria | **ĐÃ ĐÓNG TRIỆT ĐỂ** — xác minh bằng `P7D-1..P7D-5` (real DO SQLite hibernation/reconnect) và 30,000 trận (`0` privacy leak, `0` stall, `113` thăm dò trái phép bị chặn). | Duy trì kiểm thử tự động trong CI. |
| **P1 (Tồn dư đã ghi nhận)** | **Kênh phụ thời gian (Residual Timing Side-Channel)** khi mở `choice-secret-*` (`Vengeful Spirit`, `Undying`, `Arnold`, `Cindy`, `Usurper`, `Wendigo`, `Bianca`) | Payload JSON/log/VFX sạch 100% và `publicDeadlineMs` chuẩn hóa, `SET_REACTION_PREF = AUTO_DECLINE` phản hồi `< 1ms`. Tuy nhiên nếu chủ phản ứng chọn `ASK` và suy nghĩ vài giây, người chơi dày dạn vẫn có thể suy đoán bàn đang có vai phản ứng kín. | Theo dõi tỷ lệ khai thác trong Human Beta; xem xét tùy chọn *Uniform Padded Reaction Window* cho chế độ thi đấu xếp hạng sau Beta. |
| **P2 (Tồn dư UX)** | Tín hiệu thời điểm `pausedForOwnerDecision: true` khi nạn nhân Voodoo rút lá Điều tra (`inv-*`) | Không lộ nội dung lá bài hay kết quả điều tra, nhưng công khai thời điểm nạn nhân đang chọn mục tiêu Điều tra (vốn đã biết vì đi vào ô rút bài Xanh). | Giữ nguyên vì cần giải thích rõ cho Voodoo lý do tạm chờ; kiểm tra trải nghiệm trong Human Beta. |

---

## 2. Rủi ro Cân bằng & Bot-Meta vs Human-Meta

1. **Outliers quá cao trong mô phỏng bot (chưa tự động chỉnh luật):**
   - **`Anathema` (`81.08%`)**, **`G43 + Holy Robe` (`73.64%`)**, **`Cindy 5P` (`69.44%`)**, **`Angel 5P` (`69.69%`)**, **`Wrath` (`57.81%`)**, **`Bethany` (`56.56%`)**, **`Undead` (`53.02%`)**.
   - Phần lớn bắt nguồn từ hạn chế phối hợp xã hội của bot (không liên minh ép bắn xuyên Anathema, không chủ động dồn sát thương sau khi Undead hồi sinh 6 HP hoặc cướp Áo Choàng của G43).
2. **Outliers quá thấp trong mô phỏng bot (chưa tự động chỉnh luật):**
   - **`N.C. Soldier` (`0.88%`)**, **`Colt` (`8.50%`)**, **`Bonnie` (`9.80%`)**, **`Antimony` (`16.32%`)**, **`Diana` (`18.94%`)**, **`Cain` cá nhân (`24.00%`)**.
   - Đặc biệt **`N.C. Soldier`** đòi hỏi giao điểm cực gắt (chiêu mộ mọi Neutral khác còn sống/chưa đổi phe + thủ lĩnh tự sở hữu đúng 3 lá Đen đơn bản `ev-06`, `ev-05`, `ev-03`). Rất có khả năng Human Beta sẽ xác nhận cần nới nhẹ điều kiện vũ khí hoặc cho phép cả liên minh góp vũ khí ở bản cân bằng sau Beta.
3. **Nhịp độ ván đấu (`Pacing`):** Trung bình `5.06` Pending Choices/trận (tăng từ `4.25` ở S48 do `lloyd_interrupt_attack` xuất hiện `30,025` lần). Trên bàn người thật, nếu Lloyd hay ngắt nhiều đòn liên tiếp, thời gian chờ có thể tăng — cần đo thực tế `decision latency` trong Human Beta.

---

## 3. Các Điểm Mơ hồ Luật Gốc Vẫn Giữ Trạng thái `house-rule-approved`

Toàn bộ **52/56** nhân vật mở rộng (gồm cả 8 nhân vật Tier-4 Phase 7) giữ nguyên nhãn **`house-rule-approved`** và **không** được đánh dấu `verified` cho tới khi có đối chiếu trực tiếp bản in thẻ tiếng Anh/Nhật gốc:

- **Phase 7 Tier-4 (`rules-decisions.md`):**
  - `RC-01` (`Voodoo`): Mô hình *Deferred Hijack* lượt kế, tạm dừng cho thẻ Điều tra `inv-*`.
  - `RC-02` (`Undead`): Quy ước hồi sinh **6 HP còn lại** (`woundsTaken = 5`) thay vì 6 vết thương; miễn bị ép lộ diện trước lần chết đầu.
  - `RC-03` (`Bonnie`): Chuyển `effectiveFaction` ở Bước 6a trước khi đánh giá thắng Hunter khi hạ Shadow cuối.
  - `RC-04` (`Vengeful Spirit` & `Antimony`): Chuẩn hóa điều kiện thắng Shadow của Vengeful Spirit về *tất cả Hunter hoặc 3 Neutral* (ghi nhận sai lệch nguyên văn tiếng Việt); Antimony bắt buộc sao chép người chết đầu theo `turnOrder` và giữ `baseFaction = 'wanderer'`.
  - `RC-05` (`Cain`): Hồi máu theo số người **còn sống**; khi chết sau kích hoạt mở `MultiFactionVictory` đồng thắng cả Hunter và Shadow; tách điều kiện 5P (tự kết liễu) vs 6P–8P (đã chết).
  - `RC-06` (`Lloyd`): Phải đã lộ diện, ngắt đòn toàn bàn trước RNG với chi phí 2 HP không thể chặn (cho phép hy sinh HP cuối), hủy Machine Gun như 1 hành động.
  - `RC-09` (`N.C. Soldier`): Chỉ chiêu mộ Neutral đã lộ diện, ngưỡng `woundsTaken >= 5` tích lũy, thủ lĩnh tự cầm đủ 3 vũ khí, loại khỏi pool bàn 5P.
- **Các Phase trước vẫn giữ mở:** `RC-13` (`Diana`), `RC-14` (`Aaron`), `RC-15` (`Dalton` 12 remaining HP vs 12 vết thương), `RC-16` (`Gideon`), `RC-20` (`CopiedVictoryGraph` & `Bethany` đồng thắng khi đã chết).

---

## 4. Rào cản Duy nhất Trước Public Launch (Blocker)

- **Blocker duy nhất trước khi mở khóa Production cho bất kỳ gói mở rộng nào (`expansion-1`, `expansion-2`, `full-expansion`):** **Chưa thực hiện Human Beta Playtest (`>= 100` trận người thật 4P–8P).** Do đó, toàn bộ gói mở rộng tiếp tục bị khóa cứng `enabledInProduction = false` trên Production.
