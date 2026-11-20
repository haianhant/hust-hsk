# Bóng Đêm KTX — Phase 4 Remaining Risks, Side-Channel Audit & Technical Debt Register

> **Phạm vi:** Tổng hợp đầy đủ các rủi ro bảo mật, cân bằng và kỹ thuật sau khi hoàn tất **Phase 4 (Wave 3 — `starter-twenty-six`: 36 nhân vật chơi được, 36 chân dung Anime Noir)**, làm đầu vào cho đợt **Internal Human Playtest** và **Phase 5 / Wave 4**.

---

## 1. Rủi ro P0 (An toàn Production & Bảo mật)

| Mã | Rủi ro | Trạng thái | Kiểm soát & Hướng xử lý |
|---|---|---|---|
| **R4-P0-01** | Bật nhầm bất kỳ ruleset mở rộng nào (`starter-four`, `starter-eight`, `starter-sixteen`, `starter-twenty-six`, `expansion-1/2`, `full-expansion`) lên production | ✅ **Đã khóa cứng** | `wrangler.toml` không đặt `ALLOW_EXPERIMENTAL_RULESETS`; `enabledInProduction: false`; test `P4B`, `P4C`, `P4D-3` xác nhận production DO luôn trả `HTTP 400 / RULESET_UNAVAILABLE`. |
| **R4-P0-02** | **Hidden-Reaction Timing Side-Channel** (3 vai phản ứng bí mật: `Wendigo`, `Undying`, `Cindy`) | ⚠️ **Đã che nội dung P0; cần thiết kế giảm thiểu timing trước khi mở production** | Xem phân tích chuyên sâu và thiết kế khắc phục ở **Mục 2** bên dưới. |

---

## 2. Đánh giá Chuyên sâu: Hidden-Reaction Timing Side-Channel & Phương án Giảm thiểu

### 2.1. Hiện trạng
Hiện có **3 vai trò** sở hữu cửa sổ `PendingChoice` bí mật (`isSecret: true`):
1. `exp1_wendigo` (`wendigo_reveal_heal` tại `ON_ELIMINATION`)
2. `exp1_undying` (`undying_reveal_reduce` tại `BEFORE_DAMAGE` khi sát thương `>= 2`)
3. `exp1_cindy` (`cindy_reveal_retaliate` tại `AFTER_DAMAGE` khi nhận sát thương trực tiếp)

*(Cả 6 `PendingChoice` mới của Phase 4 — `fea_move_adjust`, `wrath_turn_start_aoe`, `vengeance_chain_strike`, `visions_mark_target`, `cruz_black_redraw`, `bryon_gift_equipment` — đều yêu cầu `revealed === true`, do đó **không** làm tăng bề mặt timing side-channel!)*

- **Bề mặt rò rỉ hiện tại:** Dù `publicGame.pendingChoice` đã ẩn tuyệt đối `ownerPlayerId`, `kind`, không ghi log khi `decline`/`timeout`, và tổng số vai bí mật trong pool đã tăng (giảm xác suất đoán đúng đích danh), một người chơi tinh ý vẫn có thể nhận ra **bàn bị tạm dừng `1–12 giây`** ngay sau khi gây sát thương `>= 2` (suy ra mục tiêu có thể là `Undying` hoặc `Cindy`) hoặc ngay sau một pha hạ gục (suy ra trên bàn có `Wendigo` còn sống chưa lật vai).

### 2.2. Thiết kế Giảm thiểu Đề xuất (Không làm chậm nhịp lượt chơi)
Thay vì chèn độ trễ giả `3–5 giây` lên mọi đòn đánh (sẽ làm trải nghiệm chậm chạp), đề xuất **kiến trúc 2 tầng nhẹ nhàng cho Phase 5 / trước Production Beta**:
1. **Tầng 1 — Pre-Declared Client Reaction Toggle (`Auto-Decline` / `Arm Secret Skill`):**
   - Cho phép người chơi sở hữu `Wendigo`/`Undying`/`Cindy` bật/tắt công tắc riêng tư *"Tự động bỏ qua khi chưa muốn lật vai"* ngay trên HUD cá nhân (lưu server-authoritative trên `PrivatePlayerPrefs`, gửi qua WS kín).
   - Khi công tắc đặt ở `auto-decline`, server **bỏ qua ngay trong `< 1ms` mà không mở cửa sổ `PendingChoice`**, xóa sạch 100% tín hiệu tạm dừng khi người chơi muốn giữ vỏ bọc!
2. **Tầng 2 — Short Normalized Pulse (`350ms`) + Timeout rút ngắn (`8s` riêng cho secret reaction):**
   - Chỉ khi kích hoạt tùy chọn phòng *"Chống lộ nhịp (Competitive Mode)"*, server chèn độ trễ đồng nhất `350ms` sau mỗi đòn `>= 2` sát thương / sự kiện loại người chơi bất kể có vai bí mật hay không — đủ nhỏ để mắt người không cảm thấy chậm (khớp đúng thời lượng animation va chạm VFX `320–400ms`!), đồng thời rút `pendingChoice` timeout cho phản ứng bí mật từ `12s → 8s` để giữ nhịp lượt nhanh gọn.

---

## 3. Rủi ro P1 (Cân bằng & Trải nghiệm Playtest `starter-twenty-six`)

| Mã | Rủi ro | Dữ liệu 15k-match | Hướng theo dõi trong Human Playtest |
|---|---|---|---|
| **R4-P1-01** | **`G43 + Holy Robe` (`69.16%`)** tiếp tục là outlier combo #1 dù `G43` tổng đã hạ xuống `57.75%` | `535` lượt xuất hiện combo (`S8: 70.10%` → `S16: 68.76%` → `S26: 69.16%`); trong khi `G43 vs Wrath` tụt còn `50.63%` | Thu thập ≥ 100 ván người thật; nếu combo vẫn `> 62%`, xem xét house rule không cộng dồn giảm thương đòn đánh vượt quá `2`. |
| **R4-P1-02** | **`Wrath` (`49.59%`, `8.78` dmg TB/trận)** là Shadow mạnh nhất toàn bộ 36 tướng | Cao nhất trong 14 Shadow (`Werewolf 48.02%`), góp phần kéo `avgRounds` về `7.67` | Theo dõi mức độ ảnh hưởng ở bàn 7P–8P và hiệu quả né cụm + rủi ro friendly-fire lên đồng đội Shadow ở người thật. |
| **R4-P1-03** | **`Cindy` 5P (`66.30%`)** & **`Bipolar` (`55.14%`)** có tỷ lệ đồng thắng cao | `Cindy 5P`: `244/368`; `Bipolar`: `1,107` Hunter-alive + `593` Shadow-dead (`Bryon 5P` ở mức lành mạnh `46.93%`) | So sánh cảm nhận người thật giữa `Bryon` 5P (`46.93%`) và `Cindy` 5P (`66.30%`), đồng thời quan sát chiến thuật giữ sống Bipolar của Shadow. |
| **R4-P1-04** | **`Eleanor` (`33.61%`)** và **`Cruz` (`21.09%`)** thấp hơn trung bình trong bot play | Bot không trao đổi thông tin thẻ Xanh và ít canh dứt điểm bài Đen | Xác nhận giả thuyết tăng hiệu suất ở người thật trước khi cân nhắc bất kỳ điều chỉnh nào. |
| **R4-P1-05** | **30 nhân vật mở rộng còn lại (`6H / 7S / 17N`)** chưa phê duyệt luật & chưa implement | `30/56` giữ nghiêm `needs-clarification` / `not-started` | Cổng `isCharacterPlayable()` + `validate-character-catalog.cjs` chặn 100%; không mở `expansion-1`, `expansion-2`, `full-expansion` khi còn bất kỳ vai chưa xong. |

---

## 4. Rủi ro P2 (Kỹ thuật & Nợ Kỹ thuật)

| Mã | Mô tả | Trạng thái & Khuyến nghị |
|---|---|---|
| **R4-P2-01** | **Chuỗi nhiều Pending Choice trong 1 lượt:** Số loại Pending Choice đã lên **15** (từ 9 ở Phase 3). Chuỗi cực đoan (vd. `Wrath` → `Undying` → `Cindy` → `Vengeance` → `Wendigo`) hoạt động 100% không deadlock (`P4D-1`, `69,211` choices trong 15k trận), nhưng cần theo dõi tổng thời gian chờ trong Human Playtest. | Cân nhắc hạ timeout phản ứng bí mật từ `12s → 8s` kết hợp công tắc `Auto-Decline` (xem Mục 2.2). |
| **R4-P2-02** | **Chênh lệch nguồn gốc `Fallen` (`>= 8` remaining HP vs `>= 8` wounds):** Đã ghi nhận minh bạch là `house-rule-approved` (`RC-15`). | Giữ nguyên trạng thái `house-rule-approved` cho đến khi có đối chiếu bản in gốc chính thức hoặc quyết định chốt luật nội bộ HUSTVerse. |
| **R4-P2-03** | **Ngân sách dung lượng ảnh cho 30 tướng tiếp theo:** Cả 10 ảnh Wave 3 đạt trung bình `92.2 KB/ảnh` (`63.5–108.2 KB`, tổng `922.1 KB`). | Tiếp tục duy trì tiêu chuẩn WebP `1024×1536`, `q=84`, `< 150 KB/ảnh` + `loading="lazy"` để giữ tổng tải trang mượt trên di động khi tiến tới 66/66 chân dung. |
| **R4-P2-04** | **Các cơ chế lõi Tier 3–4 chưa xây cho 30 tướng cuối:** `HealPipeline` (`Gwendolen`, `Ernest`, `Freyja`, `Angel`, `Bianca`), `DamageRedirection` có chặn vòng lặp (`Gideon`, `Aaron`), `CopiedVictoryGraph` (`Cassie`, `Clairvoyant`, `Diana`, `Antimony`), `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), `GlobalAttackInterrupt` (`Lloyd`). | Tách rõ thành **Wave 4 (Tier 2 cuối + Tier 3)** và **Wave 5 (Tier 4 Core Mechanics)** theo lộ trình tại [`../expansion-roadmap.md`](../expansion-roadmap.md). |
