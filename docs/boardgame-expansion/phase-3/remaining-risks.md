# Bóng Đêm KTX — Phase 3 Remaining Risks & Technical Debt Register

> **Phạm vi:** Tổng hợp các rủi ro còn tồn đọng sau khi hoàn tất **Phase 3 (Wave 2 — `starter-sixteen`: 26 nhân vật chơi được, 26 chân dung Anime Noir)**, làm đầu vào trực tiếp cho đợt **Internal Beta Playtest** và **Phase 4 / Wave 3**.

---

## 1. Rủi ro P0 (An toàn Production & Bảo mật)

| Mã | Rủi ro | Trạng thái | Kiểm soát & Hướng xử lý tiếp theo |
|---|---|---|---|
| **R3-P0-01** | Bật nhầm ruleset mở rộng (`starter-four`, `starter-eight`, `starter-sixteen`, `expansion-1/2`, `full-expansion`) lên production | ✅ **Đã khóa cứng** | `wrangler.toml` không bật `ALLOW_EXPERIMENTAL_RULESETS`; `enabledInProduction: false`; test `P3A-1`, `P3B-5`, `P3C-3` xác nhận production DO trả `HTTP 400 / RULESET_UNAVAILABLE`. |
| **R3-P0-02** | Timing side-channel ở phản ứng bí mật (`Wendigo`, `Undying`, `Cindy`) | ⚠️ **Đã che nội dung, còn cần quan sát timing thực tế** | `publicGame.pendingChoice` ẩn hoàn toàn `ownerPlayerId` và `kind` (`null`), không log khi decline/timeout. Với việc thêm `Cindy`, tổng số vai phản ứng bí mật đã lên 3 vai (giảm khả năng đoán đích danh 1 vai, nhưng người chơi kinh nghiệm vẫn có thể nhận ra *có ít nhất một vai phản ứng bí mật đang sống* khi bàn tạm dừng sau đòn đánh). **Hướng xử lý Wave 3/4:** Cân nhắc tùy chọn phòng *normalized reaction pulse* (delay đồng nhất 350–500ms) trước khi bật production. |

---

## 2. Rủi ro P1 (Cân bằng & Trải nghiệm Playtest)

| Mã | Rủi ro | Dữ liệu 10k-match | Hướng theo dõi trong Human Playtest |
|---|---|---|---|
| **R3-P1-01** | **`G43` (`62.76%`) & `G43 + Holy Robe` (`68.76%`)** vẫn là outlier #1 | Giảm mạnh khi có `Warlock` (`58.02%`) hoặc `Unchained` (`59.33%`), nhưng tổng thể vẫn cao hơn mức trung bình Hunter (`46.96%`) | Thu thập dữ liệu ≥ 100 trận người thật (biết dùng `Flare`, `Dynamite`, `Ô 9`, cướp `Holy Robe`) trước khi quyết định có áp house rule trần giảm thương hay giữ luật gốc. |
| **R3-P1-02** | **`Bipolar` (`57.32%`)** & **`Allie` (`58.32%`)** có tỷ lệ đồng thắng cao | `Bipolar`: `1,042` Hunter-alive + `493` Shadow-dead wins | Quan sát xem người chơi thật (khác bot) có chủ động *không giết Bipolar khi Shadow áp đảo* / *truy sát Bipolar khi Hunter áp đảo* để kéo tỷ lệ thắng về vùng `40–50%` hay không. |
| **R3-P1-03** | **`Cindy` tại bàn 5P (`72.76%` co-win fallback)** và tốc độ thắng solo tại bàn 6P/8P (`24.6%–27.05%` Neutral primary) | 5P (`323` app, `0` auto-win đầu trận, `235` co-win); 6P–8P (`684/2,331 = 29.34%` solo) | Kiểm tra cảm nhận người chơi ở bàn 5P (có nên siết fallback 5P) và bàn 6P (chỉ cần 1 Neutral kia chết để Cindy thắng ngay). |
| **R3-P1-04** | **40 nhân vật mở rộng còn lại** chưa có luật phê duyệt & chưa implement | `40/56` giữ nguyên `needs-clarification` + `not-started` | Cổng `isCharacterPlayable()` + `validate-character-catalog.cjs` chặn tuyệt đối; tuyệt đối không mở `expansion-1`, `expansion-2` hay `full-expansion` trước khi hoàn thiện đủ từng gói. |

---

## 3. Rủi ro P2 (Kỹ thuật & Vận hành)

| Mã | Mô tả | Trạng thái & Gợi ý |
|---|---|---|
| **R3-P2-01** | Chuỗi nhiều Pending Choice liên tiếp trong 1 lượt (`Elysia MG` → `Undying` → `Cindy` → `Wendigo`) có thể kéo dài thời gian 1 lượt nếu nhiều người chơi nghĩ sát hạn 12s | Engine xử lý 100% an toàn (`P3C-1`, 0 deadlock); trong Human Playtest cần đo tổng thời gian chờ chuỗi phản ứng để cân chỉnh timeout riêng cho secret reaction (ví dụ `8–10s`) nếu cần. |
| **R3-P2-02** | Quy tắc `eq_chocolate` (`A/E/U`) trên chế độ mở rộng | Hiện `actions.ts` kiểm tra theo danh sách vai mở rộng có tên nguồn bắt đầu bằng `A/E/U` (`Undying`, `Elysia`, `Unchained`, cùng 3 vai Classic). Ở Wave 3 nên đọc động chữ cái đầu `sourceName` từ `DEFAULT_CHARACTER_REGISTRY` khi `isExpandedRuleset(state)` để tự động khớp mọi vai mới (`Aaron`, `Albert`, `Anathema`, `Antimony`, `April & Skipps`, `Arlene`, `Arnold`, `Emma`, `Ernest`, `Erwin`, `Evelyn`, `Umibozu`, `Undead`, `Usurper`). |
| **R3-P2-03** | Kích thước tài nguyên hình ảnh khi mở rộng lên 66 nhân vật | 16 ảnh mới (Starter Eight + Wave 2) đều dưới `170 KB/ảnh` (tổng 8 ảnh Wave 2 chỉ `886.7 KB`) với `loading="lazy"` + `decoding="async"`. Nên duy trì ngân sách `< 200 KB/ảnh` cho các đợt chân dung kế tiếp để giữ `CLS = 0` và thời gian tải thấp trên di động. |
