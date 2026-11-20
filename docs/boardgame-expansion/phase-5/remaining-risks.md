# Bóng Đêm KTX — Phase 5 Remaining Risks, Unresolved Ambiguities & Technical Debt Register

> **Phạm vi:** Tổng hợp minh bạch mọi rủi ro an toàn, điểm mơ hồ luật gốc chưa có nguồn xác minh chính thức, ngoại lệ cân bằng từ 20,000-match simulation và hạng mục kỹ thuật còn lại sau khi hoàn tất **Phase 5 (Wave 4 — `starter-thirty-eight`: 48/66 nhân vật chơi được, 48/48 chân dung Anime Noir)**.

---

## 1. Rủi ro P0 (Production Safety & Bảo mật Danh tính)

| Mã | Rủi ro | Trạng thái | Kiểm soát & Hướng xử lý |
|---|---|---|---|
| **R5-P0-01** | Bật nhầm ruleset mở rộng (`starter-thirty-eight` hoặc `starter-*` / `expansion-*`) lên production | ✅ **Đã khóa cứng** | `wrangler.toml` không đặt `ALLOW_EXPERIMENTAL_RULESETS`; `enabledInProduction: false`; `P5C-1`, `P5D-5`, `P5E-2` xác nhận production DO luôn trả `HTTP 400 / RULESET_UNAVAILABLE`. |
| **R5-P0-02** | **Residual Timing Side-Channel khi người chơi giữ `'ASK'`** trên 5 vai bí mật (`Wendigo`, `Undying`, `Cindy`, `Urban Legend`, `Usurper`) | ⚠️ **Đã giảm nhẹ đáng kể bằng `CAP-05` `SET_REACTION_PREF` unicast; vẫn tồn dư khi giữ `'ASK'`** | Xem phân tích chi tiết 4 kênh tồn dư và lộ trình khắc phục (*Competitive Normalized Pulse `350ms`*, đồng bộ `deadlineMs`, AoE log batch-flush) tại [`privacy-side-channel-report.md`](./privacy-side-channel-report.md). |

---

## 2. Điểm Mơ hồ Luật Gốc & Quy ước Thử nghiệm Cần Chốt Trước Public Beta (`house-rule-approved`)

| Mã | Nhân vật / Cơ chế | Mơ hồ Gốc / Quy ước HUSTVerse | Tác động Thực tế & Khuyến nghị |
|---|---|---|---|
| **R5-RULE-01** | **`Dalton` (`exp2_dalton`) — `RC-15`: `12 remaining HP` vs `12 wounds` (`1 HP` còn lại)** | Nguồn tiếng Việt ghi *"chạm mức 12 máu"*, chưa có bản nguồn xác minh chính thức xem đó là **12 HP còn lại** hay **12 vết thương**. Phase 5 tạm dùng quy ước thử nghiệm **`<= 12` remaining HP** (nhất quán với `Fallen`/`Fujiko`). | 🚨 **Tác động lớn nhất trong 20k sim:** Dalton đạt **`50.73%` win rate** với **`85.2%` chiến thắng đến từ kill ngay sau kích hoạt** (`1,131/1,328` trận thắng) vì chỉ cần mất 1 HP là kích hoạt Vòng 12! **Khuyến nghị mạnh cho Playtest:** kiểm chứng cảm giác người thật — nếu quá dễ thắng solo, chuyển quy ước sang ngưỡng cao hơn (ví dụ `wounds >= 12` hoặc yêu cầu đã lộ diện + ngưỡng vết thương rõ ràng) sau đợt Human Playtest. |
| **R5-RULE-02** | **`Gwendolen` (`exp1_gwendolen`) — Quy tắc Bảo mật Thử nghiệm `preRevealed === true`** | Luật gốc không quy định rõ nạn nhân Hunter/Neutral có cần đã lộ diện trước khi Gwendolen phản công không. HUSTVerse áp đặt `preRevealed === true` để chặn tuyệt đối việc cửa sổ phản công làm lộ phe của người chơi đang úp vai. | ✅ Bảo vệ P0 100%, giữ Gwendolen cân bằng ở **`37.51%`**. Ghi nhận rõ đây là experimental privacy rule, không phải official verified rule. |
| **R5-RULE-03** | **`Fallen` (`exp1_fallen`) — `RC-15`: `>= 8` remaining HP vs `>= 8` wounds** | Tương tự Dalton, vẫn giữ trạng thái `house-rule-approved` (`>= 8` remaining HP). | Cân bằng ổn định ở `38.20%` trên S38. |

---

## 3. Rủi ro P1 (Cân bằng & Quan sát Cho Human Playtest — Không tự chỉnh thông số)

| Mã | Hạng mục | Số liệu 20,000-match (`starter-thirty-eight`) | Đánh giá & Kế hoạch Human Playtest |
|---|---|---|---|
| **R5-P1-01** | **`Dalton` (`50.73%`)** | `1,131` kill-wins vs `197` highest-HP wins | Ưu tiên #1 đánh giá quy ước `RC-15` trong Human Playtest. |
| **R5-P1-02** | **`G43 + Holy Robe` (`64.84%`) & `G43` tổng (`55.64%`)** | Hạ liên tiếp `70.10% → 68.76% → 69.16% → 64.84%`; `G43 vs Wrath = 40.12%` | Đã cải thiện đáng kể nhưng combo vẫn > 62%; tiếp tục theo dõi trên người thật. |
| **R5-P1-03** | **`Wrath` (`52.62%`)** & **Classic `Werewolf` (`51.92%`)** | Hai Shadow mạnh nhất trên pool 48 vai (`Wrath` gây `8.51` bonus dmg/app) | Theo dõi hiệu quả né cụm và rủi ro friendly-fire của Wrath trên bàn 7P–8P người thật. |
| **R5-P1-04** | **`Ernest` (`28.40%`), `Eleanor` (`28.76%`), `Arlene` (`18.89%`)** | Ba vai suy luận/giao tiếp xã hội thấp trong bot play | **Không buff trước playtest:** cả 3 phụ thuộc mạnh vào phối hợp/đóng kịch giữa người chơi thật. |
| **R5-P1-05** | **`Angel` (`48.25%`) & `Cindy`/`Allie`/`Bipolar` ở bàn 5P** | `Angel` thắng `862` trận chỉ nhờ all-Neutrals-alive (`66.6%` số trận thắng) | Theo dõi riêng bàn 5P (1 Neutral duy nhất) trong Human Playtest xem các điều kiện "tất cả Neutral còn sống" có cần thống nhất luật 5P không. |
| **R5-P1-06** | **18 nhân vật mở rộng cuối cùng (`2H / 3S / 13N`) chưa triển khai** | Khóa cứng `needs-clarification` / `not-started` (`10 Exp1 · 8 Exp2`) | Không mở `expansion-1`, `expansion-2`, `full-expansion` khi còn bất kỳ nhân vật nào chưa hoàn thiện. |

---

## 4. Rủi ro P2 (Kỹ thuật & Hạ tầng cho Wave 5 Cuối cùng)

| Mã | Mô tả | Hướng xử lý cho Wave 5 (Phase 6) |
|---|---|---|
| **R5-P2-01** | **Chuỗi 22 Pending Choice & nhịp lượt bàn đông 7P–8P:** Hoạt động 0 deadlock trên 20,000 trận (`77,626` choices), nhưng bàn người thật cần UX gọn nhẹ. | Bật sẵn gợi ý `AUTO_DECLINE` trên HUD cá nhân + cân nhắc rút secret timeout `12s → 8s`. |
| **R5-P2-02** | **Chênh lệch dung lượng WebP cho 18 chân dung cuối:** 12 ảnh Wave 4 đạt trung bình `110.7 KB/ảnh` (`84.6–152.4 KB`), tổng 48 chân dung nhẹ & load lazy mượt (`CLS=0`). | Duy trì chuẩn `1024×1536`, `q=84`, `< 200 KB` cho 18 chân dung cuối để hoàn tất 66/66 chân dung. |
| **R5-P2-03** | **6 cơ chế lõi phức tạp còn lại cho 18 vai Wave 5 (`10 Tier-3 + 8 Tier-4`):** `DamageRedirection` có cycle guard (`Gideon`, `Aaron`), `CopiedVictoryGraph` có cycle detection (`Cassie`, `Clairvoyant`, `Diana`, `Antimony`), `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), `DynamicSkillCopy` (`Vengeful Spirit`, `Antimony`), `GlobalAttackInterrupt` (`Lloyd`). | Triển khai theo đúng kiến trúc tách lớp ở Wave 5A (hạ tầng + cycle guards) → Wave 5B (10 Tier-3 cuối) → Wave 5C (8 Tier-4) → Wave 5D (18 chân dung) → Wave 5E (full 66-character 30k sim & unlock `expansion-1` / `expansion-2` / `full-expansion`). |
