# Bóng Đêm KTX — Phase 2 Rules Decisions & Ratification Log

> **Nguyên tắc biên soạn:**
> - Toàn bộ quy định đề xuất dưới đây chỉ áp dụng cho chế độ **Expanded (thử nghiệm nội bộ `starter-four` / `starter-eight`)** và **KHÔNG thay đổi bất kỳ luật, RNG hay điều kiện thắng nào của bản Classic**.
> - Luật nguồn gốc từ `https://thegioiboardgame.vn/` trong [`character-catalog.json`](../character-catalog.json) được giữ nguyên văn.
> - Các house rule cân bằng cho Phase 2B được phân loại rõ là **`HOUSE_RULE_APPROVED_EXPERIMENTAL`** (không ghi nhãn là Verified Official Rule).

---

## 1. Quy tắc Chung cho Chế độ Mở rộng (Common Rules A–D)

### CR-A: Quy tắc Lộ diện (Reveal Rule)
- **Source rule:** Luật Shadow Hunters gốc quy định kỹ năng đặc biệt chỉ hoạt động khi đã lộ diện, trừ khi thẻ ghi rõ được kích hoạt bằng hành động lộ diện tại thời điểm sự kiện hoặc không cần lộ diện.
- **Ambiguity:** Nhiều bản dịch trên `thegioiboardgame.vn` lược bớt cụm *"khi đã lộ diện"* (`Gayle`, `Felicia`, `Victor`, v.v.), trong khi `Wendigo` và `Undying` ghi *"có thể lộ diện (hoặc đã lộ diện)"*.
- **Proposed HUSTVerse rule:**
  1. Mặc định mọi kỹ năng mở rộng chỉ hoạt động khi `player.revealed === true`.
  2. Ngoại lệ ghi rõ *reveal-on-trigger* (`Wendigo`, `Undying`): khi chưa lộ diện, server mở **Secret Pending Choice** để chính chủ quyết định lật vai + kích hoạt hoặc giữ kín danh tính. Tuyệt đối **không tự động lật vai**.
- **Balance rationale:** Giữ nguyên chiều sâu suy luận ẩn vai của Shadow Hunters và bảo vệ quyền chọn thời điểm lật vai của người chơi.
- **Tests:** `P2A-2a`, `P2A-3`, `P2A-4`, `P2A-5` (`test/boardgame-phase2a.test.cjs`).
- **Decision status:** `RATIFIED_EXPERIMENTAL`

### CR-B: Quy ước HP, Sát thương & HP Cost
- **Source rule:** Shadow Hunters dùng thanh vết thương (`0..maxHp`); Bóng Đêm KTX lưu `hp = maxHp - woundsTaken`.
- **Ambiguity:** Phân biệt giữa sát thương có thể giảm bởi trang bị/kỹ năng với chi phí tự trả HP (`Charles -2 HP`, `Victor -1 HP`).
- **Proposed HUSTVerse rule:**
  1. `hp = Math.max(0, maxHp - woundsTaken)` luôn bất biến; không có sát thương âm; không hồi vượt `maxHp`.
  2. Tách biệt `applyHpCost` (`isHpCost: true`, không thể bị giảm bởi trang bị/khiên/G43/Undying) với `applyExpandedDamage`.
  3. Mỗi damage instance có `damageEventId` duy nhất chống áp dụng trùng lặp.
- **Balance rationale:** Ngăn lỗi giảm chi phí trả máu bằng giáp hoặc hồi máu ngược từ phép trừ sát thương.
- **Tests:** `P2A-2b`, `P2A-3`, `P2A-5`.
- **Decision status:** `RATIFIED_EXPERIMENTAL`

### CR-C: Thứ tự Xử lý Sự kiện Deterministic (Event Ordering)
- **Source rule:** Thứ tự phân giải đòn đánh, giảm sát thương, hạ gục và kiểm tra thắng cần nhất quán khi có nhiều trigger cùng lúc.
- **Ambiguity:** Thiếu chuẩn hóa khi `Wyvern`, `Wendigo`, `Daniel`, `Werewolf` và `VictoryEngine` cùng phát sinh trong một đòn đánh.
- **Proposed HUSTVerse rule:** Chuẩn hóa 10 bước: (1) Validate action & target → (2) Server deterministic RNG → (3) Pending choice hợp lệ nếu có → (4) Resolve attack & modifiers → (5) Apply damage (per-instance `damageEventId`) → (6) Resolve elimination triggers (`Wyvern` priority 10, `Wendigo` priority 20) trước khi kết luận thắng nhưng không hồi sinh người đã chết → (7) Evaluate victory → (8) Persist SQLite → (9) Broadcast public/private projections → (10) Client VFX.
- **Balance rationale:** Đảm bảo tái lập 100% theo seed và tránh rò rỉ kết quả chưa commit.
- **Tests:** `P2A-2b`, `P2A-4`, `P2A-6`.
- **Decision status:** `RATIFIED_EXPERIMENTAL`

### CR-D: Pending Choice & Phản ứng Ngoài Lượt (Async Choice Handling)
- **Source rule:** Các kỹ năng như `Fiona`, `Wendigo` (và Phase 2B: `Gayle`, `Felicia`, `Victor`, `Undying`) yêu cầu người chơi chọn giữa nhiều phương án sau khi RNG/sự kiện phát sinh.
- **Ambiguity:** Nguy cơ treo ván khi mất kết nối, gửi lại lựa chọn đã xử lý, gian lận kết quả xúc xắc hoặc lộ vai bí mật qua public event.
- **Proposed HUSTVerse rule:**
  1. Lưu `pendingChoice` + hàng đợi `pendingSteps` thuần JSON ngay trong `AuthoritativeGameState` (SQLite DO).
  2. Mỗi choice gắn `choiceId`, `eventId`, `ownerPlayerId`, `options`, `deadlineMs`, `defaultOptionId`, `isSecret`.
  3. Khi `isSecret === true`: `publicGame.pendingChoice` ẩn hoàn toàn `ownerPlayerId` và `kind` (`null`), thông báo chung trung tính; chỉ chủ sở hữu thấy prompt trong `privateView.pendingChoice`; nếu từ chối hoặc timeout thì **không ghi log công khai nhắc tên vai**.
  4. Alarm DO luôn đặt theo `pendingChoice.deadlineMs` (ngay cả khi `turnTimeoutMs === 0`), rút ngắn khi chủ choice mất kết nối, và tự áp dụng `defaultOptionId` khi hết hạn.
- **Balance rationale:** Bảo vệ tuyệt đối P0 privacy, tương thích DO Hibernation / F5 reconnect và đảm bảo 0% deadlock.
- **Tests:** `P2A-2a`, `P2A-4`, `P2A-6`.
- **Decision status:** `RATIFIED_EXPERIMENTAL`

### CR-E: Tương tác Thẻ Classic (`eq_mirror`) với Shadow Mở Rộng
- **Source rule:** Disenchant Mirror (*Gương Chiếu Yêu*) trong Shadow Hunters gốc ép mọi Shadow trừ Unknown phải lộ diện.
- **Ambiguity:** Classic hardcode chỉ kiểm tra `suong-an-danh` (Vampire) và `suong-gac-cong` (Werewolf).
- **Proposed HUSTVerse rule:** Chuẩn hóa điều kiện thành `actor.faction === 'mist-order' && actor.roleId !== 'suong-tin-gia'` — tương đương 100% với Classic (chỉ có 3 Shadow) và hoạt động chính xác cho `Wendigo`, `Wyvern` (cùng `Victor`, `Undying` ở 2B).
- **Balance rationale:** Duy trì giá trị chiến thuật của thẻ White `eq_mirror` trong pool mở rộng mà không chạm Classic.
- **Tests:** `test/boardgame-engine.test.cjs` (Classic) + `test/boardgame-phase2a.test.cjs`.
- **Decision status:** `RATIFIED_EXPERIMENTAL`

---

## 2. Quyết định Luật cho 4 Nhân vật Phase 2A (Verified Source Rules)

### RD-2A-01: Wendigo (`exp1_wendigo` — Shadow, 14 HP)
- **Source rule:** *"Tiệc thịt: Khi một người khác bị tiêu diệt, bạn có thể lộ diện (hoặc đã lộ diện) nhân vật để hồi 1 máu."*
- **Ambiguity:** Thứ tự so với kiểm tra thắng và xử lý khi chưa lộ diện trong multiplayer trực tuyến.
- **Proposed HUSTVerse rule:**
  - Trigger `ON_ELIMINATION` (priority 20); không kích hoạt khi chính Wendigo chết; tối đa 1 lần cho mỗi `eliminationEventId`; hồi 1 HP tối đa tới 14 HP; không cooldown sau khi đã lật.
  - Khi chưa lật vai: mở Secret Pending Choice (`reveal_and_activate` vs `decline`, timeout fallback `decline`).
  - Chạy trước `evaluateVictory`, không hồi sinh nhân vật đã chết.
- **Balance rationale:** 14 HP kết hợp hồi +1 HP theo mỗi xác giúp Wendigo bền bỉ về cuối trận nhưng vẫn phụ thuộc vào nhịp tiêu diệt mục tiêu.
- **Tests:** `P2A-2a`, `P2A-2b`, `P2A-6`.
- **Decision status:** `VERIFIED_SOURCE_RULE`

### RD-2A-02: G43 (`exp2_g43` — Hunter, 14 HP)
- **Source rule:** *"Chế Độ Pháo Đài: Khi nhân vật này đã lộ diện, nhân vật này nhận ít đi 2 sát thương từ đòn tấn công."*
- **Ambiguity:** Thứ tự cộng dồn với `Holy Robe (eq-01)`, `Guardian Angel (eq-10)`, đòn phản kích `Werewolf`, và `Machine Gun`.
- **Proposed HUSTVerse rule:**
  - Trigger `BEFORE_DAMAGE` (priority 20, yêu cầu `revealed === true`).
  - Chỉ áp dụng cho `sourceType === 'attack'` (bao gồm đòn đánh thường, Machine Gun từng damage instance, và phản kích Werewolf); **không** giảm damage từ thẻ bài, kỹ năng hay địa điểm.
  - Giảm tối đa về `0` (không hồi máu), áp dụng đúng 1 lần trên mỗi `damageEventId`; cộng dồn tự nhiên sau `Holy Robe (-1)`.
- **Balance rationale:** Tạo mẫu Hunter tank chống đòn đánh vật lý mạnh nhưng vẫn dễ bị khắc chế bởi thẻ Đột Kích/kỹ năng trực tiếp (Counterplay rõ ràng).
- **Tests:** `P2A-3`.
- **Decision status:** `VERIFIED_SOURCE_RULE`

### RD-2A-03: Fiona (`exp2_fiona` — Hunter, 12 HP)
- **Source rule:** *"Đòn Đánh Giải Phẫu: Khi tấn công, bạn đổ xí ngầu 2 lần và giữ một trong hai kết quả để áp dụng."*
- **Ambiguity:** Tương tác vũ khí đổi xúc xắc (`Masamune`), chống client gian lận xúc xắc và xử lý timeout.
- **Proposed HUSTVerse rule:**
  - Trigger `BEFORE_ATTACK` (priority 10, yêu cầu `revealed === true`).
  - Server sinh đồng thời đúng 2 kết quả hợp lệ bằng deterministic RNG (áp dụng nhất quán `Masamune 1d4` cho cả 2 lần nếu đang trang bị).
  - Mở Pending Choice `fiona_attack_roll` (`roll_0` / `roll_1`); không tung lần thứ 3; client không thể gửi giá trị xúc xắc; quá hạn/mất kết nối tự lấy `roll_0`.
- **Balance rationale:** Tăng độ ổn định sát thương của Hunter 12 HP (giảm xác suất đánh hụt `|d6-d4|=0`) mà vẫn giữ nguyên trần sát thương.
- **Tests:** `P2A-4`, `P2A-6`.
- **Decision status:** `VERIFIED_SOURCE_RULE`

### RD-2A-04: Wyvern (`exp2_wyvern` — Shadow, 14 HP)
- **Source rule:** *"Hấp thụ: Hồi 5 máu khi giết một Hunter hoặc Neutral bằng đòn tấn công. Hồi đầy máu nếu giết một Shadow."*
- **Ambiguity:** Xác nhận điều kiện kết liễu trực tiếp, nguồn sát thương ngoài đòn đánh, và trường hợp Wyvern đã chết trước trigger.
- **Proposed HUSTVerse rule:**
  - Trigger `ON_ELIMINATION` (priority 10, yêu cầu `revealed === true && alive === true`).
  - Chỉ kích hoạt khi `sourceType === 'attack'` và `killerPlayerId === wyvern.playerId` (`victim !== wyvern`).
  - Đọc faction thực tế của nạn nhân tại thời điểm chết: `mist-order` → hồi đầy về 14 HP; `lantern-guard` / `wanderer` → hồi 5 HP (trần 14 HP).
  - Không kích hoạt nếu giết bằng thẻ bài/địa điểm/kỹ năng hoặc nếu Wyvern đã chết trước lúc trigger chạy.
- **Balance rationale:** Khuyến khích lối chơi Shadow săn kết liễu trực tiếp và tạo kịch bản rủi ro cao (hạ đồng đội Shadow để hồi đầy máu).
- **Tests:** `P2A-5`.
- **Decision status:** `VERIFIED_SOURCE_RULE`

---

## 3. Quyết định Luật cho 4 Nhân vật Phase 2B (Sẽ hoàn thiện & kiểm thử ở Milestone 2B)
*(Chờ triển khai ở Phase 2B — hiện 4 tướng `exp1_gayle`, `exp1_felicia`, `exp1_victor`, `exp1_undying` vẫn đang ở trạng thái `not-started` và chưa playable.)*
