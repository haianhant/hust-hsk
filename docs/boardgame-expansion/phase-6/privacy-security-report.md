# Bóng Đêm KTX — Phase 6 Privacy & Hidden Information Security Report

> **Phạm vi kiểm toán:** Toàn bộ 10 vai trò Tier-3 Phase 6 (`Gideon`, `Anathema`, `Bethany`, `Arnold`, `Cassie`, `Clairvoyant`, `April & Skipps`, `Colt`, `Diana`, `Aaron`), `projections.ts`, `worker/src/boardgame-room.ts`, `vfx-queue.ts`, và `midnight-noir-tokens.ts`.  
> **Nguyên tắc trung thực:** Báo cáo phân tách nghiêm ngặt **(A) Rò rỉ Payload/JSON (đã loại bỏ & kiểm chứng tự động)** khỏi **(B) Kênh phụ thời gian — Timing Side-Channels (còn tồn tại ở mức độ nhất định và được phân tích thẳng thắn)**. Chúng tôi **không** tuyên bố bằng 0 rủi ro side-channel chỉ vì JSON projection đã sạch.

---

## 1. Kiểm chứng Chống Rò rỉ Payload / DTO (Payload Leak Elimination — VERIFIED)

Toàn bộ các mục kiểm toán Section 27 đã được xác minh tự động trong [`test/boardgame-phase6a.test.cjs`](../../../test/boardgame-phase6a.test.cjs), [`test/boardgame-phase6b.test.cjs`](../../../test/boardgame-phase6b.test.cjs), [`test/boardgame-phase6c-portraits.test.cjs`](../../../test/boardgame-phase6c-portraits.test.cjs) và [`test/boardgame-phase6d-integration.test.cjs`](../../../test/boardgame-phase6d-integration.test.cjs):

| Hạng mục Bảo mật | Cơ chế Server-Authoritative | Kết quả Kiểm thử |
|---|---|---|
| **Clairvoyant private peek** | `clairvoyantVisions` chỉ được chiếu vào `privateView.clairvoyantReveals` của đúng `ownerPlayerId`. Mục tiêu vẫn giữ `revealed === false`; `publicGame`, `publicLog`, VFX diff, các người chơi khác và Spectator nhận `0` thông tin vai/phe/HP mục tiêu. | **PASS** (`P6D-5`) |
| **Cassie copied goal** | Gắn kết từ sự kiện lộ diện công khai hợp lệ (`isNormalGameplayReveal()`), loại trừ lộ diện khi chết/cuối trận; chỉ hiện trong `privateView.copiedVictoryGoalSummary` của Cassie khi Cassie chưa lộ diện. | **PASS** (`P6B-6`, `P6D-2`) |
| **Diana pending customer** | Khi Neutral đầu tiên lộ diện, Diana lưu `status: 'pending'` âm thầm. `projections.ts` **tuyệt đối không xuất** `dianaActiveCustomerByPlayer` cho đến khi `status === 'active'` và Diana đã lộ diện ở đầu lượt kế của khách hàng. | **PASS** (`P6B-10`, `P6D-5`) |
| **Aaron role gender metadata** | Bảng `character-metadata.ts` (`66/66` vai) chỉ đọc nội bộ trên server khi một nhân vật **đã lộ diện thường hợp lệ**. Không bao giờ xuất trường `gender` ra `publicGame` hay `privateView` của người chơi ẩn; không suy luận từ ngoại hình avatar người chơi. | **PASS** (`P6A`, `P6B-11`) |
| **Arnold hidden lethal reaction** | `arnold_reflect_lethal` có `isSecret: true`. Trên `publicGame.pendingChoice`: `ownerPlayerId === null`, `kind === null`, `choiceId` dùng tiền tố mờ `choice-secret-*` (đã vá cho toàn bộ 6 secret reactions: Arnold, Usurper, Urban Legend, Undying, Cindy, Wendigo để không rò tên vai qua `choiceId`!), thông điệp chung không nhắc tên Arnold; `publicDeadlineMs` được chuẩn hóa độc lập với `deadlineMs` ngắn khi mất kết nối. | **PASS** (`P6A`, `P6D-1`, `P6D-5`) |
| **Wrong-owner & Spectator rejection** | Mọi `RESOLVE_CHOICE` từ người chơi khác hoặc Spectator đều bị từ chối với lỗi trung tính không nêu tên chủ sở hữu hay loại phản ứng. | **PASS** (`P6D-5`) |
| **Equipment theft hand isolation** | Giao dịch cướp đồ (`court` / `ev-11` / `Bob` / `Colt`) chỉ thao tác mảng `equipped[]` công khai; không bao giờ chiếu hay đọc `hand[]` vào thông báo/publicGame. | **PASS** (`P6D-5`) |
| **VFX & Artwork P0 isolation** | `resolveRoleCardPresentation` trả `null` toàn bộ `portraitSrc`/`roleName`/`faction`/`maxHp` khi ẩn; `extractVisualEventsFromDiff` bỏ qua hoàn toàn nhân vật chưa lộ diện; Playwright `verify-phase6c-visuals.cjs` xác nhận `0` thẻ `<img>` `role-exp*.webp` trong DOM khi ẩn. | **PASS** (`P6C`, `P6D-5`) |

---

## 2. Đánh giá Trung thực Kênh phụ Thời gian (Residual Timing Side-Channels)

Dù toàn bộ payload JSON, log công khai, VFX và mã lỗi đã sạch 100%, một đối thủ quan sát kỹ vẫn có thể thu thập tín hiệu xác suất từ **kênh thời gian mạng (timing side-channels)**:

1. **Tạm dừng bàn khi có phản ứng bí mật (`arnold_reflect_lethal`, `cindy_reveal_retaliate`, `undying_reveal_reduce`, `wendigo_reveal_heal`, `usurper_reveal_block_heal`, `urban_legend_reveal_heal`):**
   - *Hiện tượng:* Khi một đòn chí mạng rơi vào một mục tiêu chưa lộ diện và bàn đấu xuất hiện `pendingChoice` (`isSecret: true`) thay vì xử lý loại ngay lập tức, người chơi tinh ý có thể suy đoán nạn nhân sở hữu một kỹ năng phản ứng ẩn (đặc biệt là Arnold nếu đòn đánh vừa đủ kết liễu).
   - *Biện pháp giảm thiểu hiện có:* (a) Gộp chung nhãn prompt công khai cho tất cả secret reactions; (b) `SET_REACTION_PREF` unicast không tăng `revision` cho phép người chơi tự động từ chối không gây pause; (c) Chuẩn hóa `publicDeadlineMs` trong `projections.ts` và `worker/src/boardgame-room.ts` để trạng thái rớt mạng của chủ phản ứng không làm ngắn đồng hồ công khai.
   - *Giới hạn còn tồn tại:* Không chèn "fake pause" nhân tạo vào mọi đòn tấn công thường để tránh làm chậm nhịp chơi của bàn đấu (UX trade-off đã chấp nhận cho chế độ experimental).
2. **Độ trễ phản hồi con người khi `arnold_reflect_lethal` kết thúc sớm:**
   - Nếu Arnold bấm từ chối nhanh (ví dụ sau `1.2s` thay vì đợi hết timeout `15s`), bàn đấu biết một người chơi còn kết nối vừa tương tác; tuy nhiên trong trường hợp từ chối sát thương chí mạng, Arnold sẽ bị loại ngay sau đó nên giá trị khai thác thực tế thấp hơn nhiều so với các phản ứng không chí mạng.
3. **Quan sát người chơi có chọn `TRANSFER_TO_BETHANY` hoặc dừng lượt tại `Clairvoyant`:**
   - `Clairvoyant` bắt buộc phải lộ diện trước khi kích hoạt `clairvoyant_peek_copy`, nên việc tạm dừng đầu lượt là thông tin công khai hợp lệ; mục tiêu cụ thể mà Clairvoyant đã soi vẫn được giấu khỏi log công khai nếu Clairvoyant chọn giữ kín (log chỉ ghi Clairvoyant đã dùng Lời Tiên Tri mà không nêu danh tính vai của mục tiêu).

---

## 3. Khuyến nghị Trước Khi Mở Khóa Production (Post-Phase 6)

- Giữ nguyên `starter-forty-eight` ở trạng thái `enabledInProduction: false` (`classic`-only trên production) cho tới khi hoàn tất playtest người thật và Phase 7 (8 tướng Tier-4 còn lại).
- Tiếp tục duy trì bộ kiểm thử hồi quy bảo mật `P6D-5` trong CI bắt buộc trên mọi PR động vào `projections.ts`, `boardgame-room.ts`, hoặc `expansion-skills.ts`.
