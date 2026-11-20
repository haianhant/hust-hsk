# Bóng Đêm KTX — Phase 5E Privacy & Side-Channel Security Report

> **Mục tiêu:** Đánh giá trung thực, đầy đủ hai chiều (**kênh rò rỉ đã loại bỏ** và **kênh rò rỉ tồn dư thực tế**) đối với toàn bộ hệ thống bảo mật P0 và phản ứng ngoài lượt trên `starter-thirty-eight` (`48` nhân vật, `22` loại `PendingChoice`, trong đó có `5` cửa sổ phản ứng bí mật: `Wendigo`, `Undying`, `Cindy`, `Urban Legend`, `Usurper` + cơ chế ngụy trang không mở prompt của `Arlene`).

---

## 1. Kiến trúc Bảo mật P0 & Các Kênh Rò rỉ Đã Loại bỏ Hoàn toàn

| # | Kênh / Rủi ro | Cơ chế Chặn Server-Authoritative | Trạng thái & Kiểm chứng |
|---|---|---|---|
| **1** | **Rò rỉ cấu hình `SET_REACTION_PREF` qua broadcast hoặc nhảy `revision`** | `worker/src/boardgame-room.ts` lưu `reactionPolicyByPlayer` vào SQLite, sau đó chỉ gửi **unicast `BG_STATE_SYNC`** tới đúng socket của chủ sở hữu — **KHÔNG tăng `revision` công khai, KHÔNG broadcast tới đối thủ, KHÔNG gửi tới Spectator, KHÔNG ghi `publicLog`**. | ✅ **Đã loại bỏ 100%** (`P5A-4`, `P5E-3`: số tin nhắn inbox của đối thủ và Spectator giữ nguyên `0` gói phát sinh, `revision` không đổi). |
| **2** | **Timing side-channel khi `Arlene` phản ứng thẻ Xanh lá** | `Arlene` không bao giờ mở cửa sổ `PendingChoice` hay tạm dừng bàn khi nhận thẻ Xanh lá. Server đọc trực tiếp `reactionPolicy` đã khai báo sẵn trên `expansionState.reactionPolicyByPlayer` và phản hồi tức thì trong `< 1ms` (`ASK`/`AUTO_ACTIVATE_WHEN_ELIGIBLE` → đáp như Shadow; `AUTO_DECLINE` → đáp đúng phe Neutral thật), giữ nguyên `player.faction = 'wanderer'`. | ✅ **Đã loại bỏ 100%** (`P5B-5`: thời gian xử lý đồng nhất với người chơi thường, không mở prompt, không rò rỉ cho Spectator). |
| **3** | **Rò rỉ phe nạn nhân ẩn qua cửa sổ phản công `Gwendolen`** | Quy tắc bảo mật thử nghiệm `preRevealed === true`: `Gwendolen` chỉ kích hoạt `gwendolen_counter_attack` khi nạn nhân trong cùng Cụm **đã lộ diện trước đòn đánh** thuộc phe Hunter hoặc Neutral. Nếu một nạn nhân đang úp vai bị tấn công, server **không mở phản ứng** — ngăn tuyệt đối việc sự kiện Gwendolen làm lộ phe của người chơi chưa lật vai. | ✅ **Đã loại bỏ 100%** (`P5C-3`: nạn nhân Neutral ẩn không mở phản ứng). *(Ghi chú: đây là experimental privacy rule của HUSTVerse, được công khai rõ trong `rules-decisions.md` và `remaining-risks.md`.)* |
| **4** | **Rò rỉ chủ sở hữu / loại kỹ năng trong `publicGame.pendingChoice` khi `isSecret === true`** | `projections.ts` ép `ownerPlayerId: null`, `kind: null`, dùng nhãn trung tính *"Đang xử lý hiệu ứng hệ thống..."* trên mọi DTO công khai & Spectator cho cả 5 phản ứng bí mật (`wendigo_reveal_heal`, `undying_reveal_reduce`, `cindy_reveal_retaliate`, `urban_legend_reveal_heal`, `usurper_reveal_block_heal`). | ✅ **Đã loại bỏ 100%** (`P5A-4`, `P5B-4`, `P5C-6`, `P5E-3`, và `0` vi phạm trên 20,000 trận sim). |
| **5** | **Rò rỉ danh tính qua thông báo lỗi khi đối thủ gửi `RESOLVE_CHOICE` thăm dò (Probing Oracle)** | Khi người chơi không phải chủ sở hữu gửi `RESOLVE_CHOICE` trong lúc có cửa sổ bí mật, server trả về chuỗi lỗi trung tính cố định (`"Đang chờ hệ thống hoàn tất lựa chọn hiện tại."`) — không nhắc tên kỹ năng, không nêu tên nhân vật (`Usurper`, `Wendigo`, `Undying`, `Cindy`, `Urban Legend`). | ✅ **Đã loại bỏ 100%** (`P5E-3`: kiểm tra trực tiếp không chứa chuỗi `"usurper"`). |
| **6** | **Rò rỉ qua `decline` / timeout, Spectator `privateView`, DOM & VFX Queue** | Khi chủ nhân chọn `decline` hoặc hết hạn timeout trên phản ứng bí mật, server **không ghi bất kỳ dòng `publicLog` hay highlight nào**. Spectator luôn nhận `privateView: null`. `resolveRoleCardPresentation` & `extractVisualEventsFromDiff` chặn 100% `portraitSrc`, `roleName`, `faction`, `maxHp`, và VFX nhận dạng vai khi `revealed === false`. | ✅ **Đã loại bỏ 100%** (`P5D-3`, `P5D-4`, `P5E-1`, `P5E-4`, `verify-phase5d-visuals.cjs`). |
| **7** | **Rò rỉ khi chủ nhân chủ động chọn `AUTO_DECLINE` hoặc `AUTO_ACTIVATE_WHEN_ELIGIBLE`** | Khi người chơi bật `AUTO_DECLINE`, server bỏ qua kiểm tra bí mật trong `< 1ms` (không mở `PendingChoice`, không tạm dừng luồng lượt chơi). Khi bật `AUTO_ACTIVATE_WHEN_ELIGIBLE` trên 6 vai nhị phân an toàn (`Wendigo`, `Undying`, `Cindy`, `Urban Legend`, `Usurper`, `Arlene`), phản ứng thực thi tức thì mà không để lộ cửa sổ chờ. | ✅ **Đã loại bỏ cho người chơi chủ động dùng policy** (`P5A-3`, `P5A-4`, `P5B-4`, `P5C-6`). |

---

## 2. Phân tích Trung thực Các Kênh Rò rỉ Tồn dư (Residual Side Channels)

Báo cáo này **không tuyên bố hệ thống đạt "zero side-channel tuyệt đối"**; với kiến trúc thời gian thực hiện tại, vẫn tồn tại **4 kênh tồn dư rõ ràng** cần minh bạch trước khi mở rộng sang môi trường thi đấu công khai:

### 2.1. Độ trễ Tạm dừng Prompt khi Người chơi giữ Chế độ `'ASK'` (Timing Pause Channel — P1)
- **Bản chất:** Khi người chơi sở hữu một trong 5 vai bí mật (`Wendigo`, `Undying`, `Cindy`, `Urban Legend`, `Usurper`) giữ mặc định `reactionPolicy: 'ASK'`, server buộc phải mở `PendingChoice` và tạm dừng luồng giải quyết sự kiện trong `1–12 giây` (tối đa `BOARD_GAME_CHOICE_TIMEOUT_MS`) để chờ quyết định của họ.
- **Khả năng suy luận của đối thủ tinh ý:**
  - Nếu bàn khựng lại `2–5 giây` ngay sau khi một lá **hồi máu `'skill'`/`'white-card'`** được kích hoạt rồi sau đó hồi máu diễn ra bình thường, đối thủ có thể suy ra nhiều khả năng có **Usurper đang ẩn vai** đã chọn `decline`!
  - Tương tự, khựng sau một lá **Đen dùng 1 lần** (`Vampire Bat`, `Spider`, `Dynamite`, `Spiritual Doll`) gợi ý nạn nhân có thể là **Urban Legend**; khựng sau sát thương `>= 2` gợi ý `Undying`/`Cindy`; khựng sau 1 pha hạ gục gợi ý `Wendigo`.
- **Giảm nhẹ đã có ở Phase 5:** Người chơi có thể bật `AUTO_DECLINE` bất kỳ lúc nào (ngoài lượt, unicast không lộ) để tắt hoàn toàn cửa sổ khựng khi muốn giữ vỏ bọc tuyệt đối, và mật độ 5 vai bí mật rải trên 38 vai mở rộng làm giảm mạnh độ chắc chắn của suy luận.
- **Chưa loại bỏ hoàn toàn:** Nếu người chơi vẫn muốn giữ `'ASK'` để cân nhắc từng tình huống, độ trễ tạm dừng vẫn quan sát được bằng mắt thường.

### 2.2. Kênh Độ trễ Mạng & Tương quan Phản hồi WebSocket (Network Latency Correlation — P2)
- **Bản chất:** Dù `ownerPlayerId` bị che bằng `null`, nếu một người chơi trong phòng đang có kết nối chập chờn / mất mạng (`connected: false`), thời điểm `PendingChoice` tự chốt đúng bằng `BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS` có thể gián tiếp tương quan với người chơi đang mất kết nối đó.
- **Hướng khắc phục tương lai:** Không lộ khác biệt deadline giữa `connected` và `disconnected` trong payload `publicGame.pendingChoice.deadlineMs` (hiện đang truyền `deadlineMs` thực), hoặc dùng cùng mức timeout `8s` cho secret reaction.

### 2.3. Kênh Thứ tự Giải quyết Chuỗi & VFX / Log (Execution Ordering Channel — P2)
- **Bản chất:** Trong một sự kiện đa mục tiêu (ví dụ `Dynamite` hoặc `Wrath` AoE đánh nhiều người theo thứ tự ghế), nếu bàn khựng lại ngay *giữa* lúc sát thương đang giải quyết tuần tự trước khi bước tiếp theo chạy, người chơi quan sát kỹ danh sách log cập nhật theo từng frame có thể khoanh vùng ai đang ở vị trí ghế vừa tạm dừng (ví dụ ghế #2 đã nhận sát thương xong, ghế #3 chưa hiện log sát thương thì cửa sổ khựng thuộc về ghế #3 — `Undying` hoặc `Urban Legend`).
- **Hướng khắc phục tương lai:** Gom nhóm buffer hiển thị log/VFX của cùng một đợt AoE cho tới khi toàn bộ đợt giải quyết xong (batch-flush public log per AoE wave) trong chế độ Competitive.

### 2.4. Kênh Tương tác Công khai Bắt buộc khi Dùng `Usurper` / `Dalton` / `Angel` (Public Game-State Mechanics — By Design)
- **Bản chất:** Khi `Usurper` đã lộ vai (`usurperAuraActive: true`), `Angel` đã lộ vai và kích hoạt hào quang (`angelProtectedPlayerIds`), hoặc `Dalton` tụt xuống `<= 12 HP` và bị ép lộ vai (`daltonActivatedPlayerIds`), thông tin đó là **trạng thái công khai hợp luật** (`revealed === true`). `projections.ts` luôn kiểm tra chặt `player.revealed === true` trước khi xuất bất kỳ badge nào lên `publicGame`, nên không tồn tại rò rỉ trước khi lộ diện.

---

## 3. Lộ trình Giảm thiểu Bổ sung Trước Khi Mở Public Competitive Beta

1. **P1 — Short Normalized Pulse (`350ms`) tùy chọn phòng (*Competitive Mode*):** Chèn nhịp đồng nhất `350ms` sau mỗi sự kiện có khả năng kích hoạt phản ứng bí mật (`heal` đủ điều kiện, `consumable black card damage`, `damage >= 2`, `elimination`) khớp thời lượng animation VFX để xóa độ tương phản giữa `0ms` và phản hồi nhanh.
2. **P1 — Đồng bộ `deadlineMs` công khai cho secret choice:** Luôn xuất cùng mốc thời gian công khai (`8s`) cho cả trường hợp `connected` và `disconnected` để loại bỏ kênh tương quan rớt mạng.
3. **P2 — AoE Log Batch-Flush:** Trì hoãn ghi log công khai từng nạn nhân trong cùng 1 đợt AoE cho đến khi đợt hoàn tất để loại trừ suy luận vị trí ghế khi có `Undying`/`Urban Legend` tạm dừng giữa chuỗi.
