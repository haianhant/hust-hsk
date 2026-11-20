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

## 3. Quyết định Luật cho 4 Nhân vật Phase 2B (HUSTVerse Experimental House Rules)

> [!IMPORTANT]
> Cả 4 nhân vật Phase 2B dưới đây sử dụng **`rulesStatus: "house-rule-approved"`** trong [`character-catalog.json`](../character-catalog.json) — **tuyệt đối KHÔNG gắn nhãn là Verified Official Rules**. Các quy tắc này chỉ được kích hoạt trong pool thử nghiệm nội bộ **`starter-eight`** (`ALLOW_EXPERIMENTAL_RULESETS=1`), giữ nguyên 100% mô tả gốc từ nguồn `thegioiboardgame.vn` và không ảnh hưởng tới `classic` hay `starter-four`.

### RD-2B-01: Gayle (`exp1_gayle` — Hunter, 14 HP)
- **Source rule:** *"Đấu sĩ thực tập: Bạn có thể đổ lại xúc xắc đánh 1 lần nữa. Nếu làm vậy, bạn bắt buộc lấy kết quả thứ 2."*
- **Ambiguity:** Phần Ưu điểm bài review nguồn có nhắc tới việc đổ lại xúc xắc di chuyển, trong khi mô tả thẻ chỉ nói "xúc xắc đánh"; chưa ghi rõ điều kiện lật vai và tương tác với vũ khí đổi xúc xắc (`Masamune`).
- **Proposed HUSTVerse rule (Experimental House Rule):**
  - Trigger `BEFORE_ATTACK` (priority 15), **chỉ áp dụng cho xúc xắc tấn công** (không áp dụng cho `ROLL_MOVE`).
  - Phải **đã lộ diện** (`revealed === true`) trước khi sử dụng.
  - Sau lần tung đầu (`firstRoll`), mở Pending Choice `gayle_attack_reroll` (`keep` vs `reroll`, timeout fallback `keep`).
  - Nếu chọn `reroll`: server tung lại bằng deterministic RNG đúng **1 lần duy nhất** theo cùng loại xúc xắc hợp lệ của vũ khí (`1d4` nếu đeo `Masamune`, `|1d6 - 1d4|` nếu thường) và **bắt buộc dùng kết quả lần 2 kể cả khi xấu hơn**; không cho xếp chồng reroll.
- **Balance rationale:** Khác biệt rõ với Fiona (chọn tốt nhất trong 2 lần, 12 HP): Gayle có 14 HP và chấp nhận rủi ro "được ăn cả, ngã về không" khi reroll.
- **Tests:** `P2B-2` (`test/boardgame-phase2b.test.cjs`).
- **Decision status:** `HOUSE_RULE_APPROVED_EXPERIMENTAL`

### RD-2B-02: Felicia (`exp1_felicia` — Hunter, 12 HP)
- **Source rule:** *"Tháo vát: Mỗi lần lấy bài, lấy 2 lá, chọn 1 lá và lá còn lại hủy."*
- **Ambiguity:** Chưa ghi rõ điều kiện lộ diện, có áp dụng cho Green Investigation (Khám Phá bí mật 1-đối-1) hay không, xử lý cạn bộ bài (0/1 lá) và phòng chống đệ quy.
- **Proposed HUSTVerse rule (HUSTVerse Experimental House Rule — KHÔNG khẳng định là luật chính thức):**
  - Trigger `ON_DRAW_CARD` (priority 10), yêu cầu `revealed === true`.
  - **Giới hạn thử nghiệm:** Chỉ áp dụng cho hai bộ bài **Trắng (`equipment` — Cung Ứng)** và **Đen (`event` — Đột Kích)**; **chưa áp dụng cho Xanh (`investigation` — Khám Phá)** để không làm lệch cơ chế điều tra bí mật và nhịp lộ phe.
  - Server rút đúng 2 lá theo đúng thứ tự bộ bài (`takeOneCardFromDeck`, tự xáo lại chồng bỏ nếu cần). Nếu chỉ còn 0 lá → chuyển `MAIN_ACTION`; nếu còn đúng 1 lá → rút thường 1 lá (không treo choice).
  - Felicia xem đầy đủ 2 lá trong `privateView.pendingChoice` (người chơi khác & Spectator tuyệt đối không thấy tên 2 lá bài trong `publicGame` hay `publicLog`), chọn giữ 1 lá (`pick_0` / `pick_1`, timeout/disconnect tự giữ `pick_0`).
  - Lá không chọn đi thẳng vào `discards[deckId]`; chỉ lá được chọn mới thực thi (đeo ngay nếu Trang bị, lên tay nếu Dùng 1 lần). Không kích hoạt đệ quy khi thẻ/kỹ năng khác tạo draw phụ (`isLocationDraw === true && !isRecursiveDraw`).
- **Balance rationale:** Giữ sức mạnh lọc bài/tìm trang bị rất tốt cho Hunter 12 HP mà không biến Felicia thành máy dò danh tính phá vỡ ẩn vai của phe Shadow/Neutral.
- **Tests:** `P2B-3`, `P2B-6` (`test/boardgame-phase2b.test.cjs`).
- **Decision status:** `HOUSE_RULE_APPROVED_EXPERIMENTAL`

### RD-2B-03: Victor (`exp1_victor` — Shadow, 13 HP)
- **Source rule:** *"Bác học điên: Mỗi lần bạn tấn công thành công, bạn có thể nhận 1 sát thương để tăng thêm 2 sát thương cho cuộc tấn công của bạn."*
- **Ambiguity:** Chưa rõ yêu cầu lộ diện, ngưỡng máu tối thiểu (có được tự sát ở 1 HP hay không), 1 HP mất có phải HP cost hay sát thương giảm được bởi giáp, và tương tác với vũ khí đánh nhiều mục tiêu (`Machine Gun`).
- **Proposed HUSTVerse rule (HUSTVerse Experimental Balance Rule):**
  - Trigger `BEFORE_DAMAGE` (phase `attack_boost_check`, priority 5), yêu cầu `revealed === true`.
  - Chỉ kích hoạt khi đòn tấn công trúng mục tiêu và **sát thương nền lớn hơn 0** (`baseDmg > 0`); tối đa 1 lần mỗi attack; thẻ bài/kỹ năng/địa điểm không kích hoạt.
  - Victor phải còn **ít nhất 2 HP thực tế** (`hp >= 2`) để trả 1 HP (không được tự sát).
  - **1 HP trả là HP cost** (`applyHpCost`, `isHpCost: true`) — **không thể bị giảm** bởi `Holy Robe`, khiên hay kỹ năng giảm thương.
  - Mở Pending Choice `victor_blood_boost` (`boost:<targetId>` hoặc `skip`, timeout fallback `skip`). Khi kích hoạt, cộng **`+2` sát thương cho ĐÚNG 1 mục tiêu được chọn** — kể cả khi cầm **Machine Gun (`ev-06`)**, không tăng đồng loạt cho mọi mục tiêu để tránh combo AoE quá mạnh.
- **Balance rationale:** Tạo mẫu Shadow chủ động đổi máu lấy đột biến dứt điểm đơn mục tiêu mà không tạo combo Machine Gun hủy diệt toàn bàn.
- **Tests:** `P2B-4`, `P2B-6` (`test/boardgame-phase2b.test.cjs`).
- **Decision status:** `HOUSE_RULE_APPROVED_EXPERIMENTAL`

### RD-2B-04: Undying (`exp1_undying` — Shadow, 11 HP)
- **Source rule:** *"Mạ Sắt: Mỗi khi bạn nhận 2 hoặc nhiều sát thương, bạn có thể lộ diện (hoặc đã lộ diện) thì sát thương nhận được giảm đi 1."*
- **Ambiguity:** Nguồn sát thương hợp lệ (chỉ attack hay gồm cả skill/card), thứ tự cộng dồn với giáp/khiên (`Holy Robe`, `Guardian Angel`, `Talisman`), bảo mật lựa chọn lật vai khi còn ẩn.
- **Proposed HUSTVerse rule (Experimental House Rule):**
  - Trigger `BEFORE_DAMAGE` (priority 30 — chạy **sau** `Guardian Shield`, `Talisman`, `Holy Robe (-1)` và `G43`, **trước** khi trừ HP).
  - Áp dụng cho sát thương từ **attack, skill và card** (`attack | skill | event | investigation`); **không** áp dụng cho HP cost (`isHpCost`), tự hy sinh, sát thương không thể ngăn chặn (`unpreventable`) hoặc bẫy địa điểm (`location`).
  - Kiểm tra ngưỡng **`>= 2` sát thương sau các phép giảm đã có**: ví dụ nhận 2 ST tấn công khi đang mặc `Holy Robe (-1)` → còn 1 ST (`< 2`) nên Undying **không** kích hoạt; nhận 3 ST khi mặc `Holy Robe (-1)` → còn 2 ST (`>= 2`) → Undying giảm thêm 1 còn 1 ST.
  - Khi chưa lộ diện: mở **Secret Pending Choice** (`undying_reveal_reduce`, `isSecret: true`, `reveal_and_reduce` vs `decline`, fallback `decline`) — tuyệt đối không tự lật vai và không lộ danh tính khi từ chối/timeout.
  - Khi đã lộ diện: tự động áp dụng giảm 1 ST đúng 1 lần mỗi `damageEventId`; không tạo hồi máu và không lặp trigger.
  - Tương tác thẻ White `eq_chocolate` (*Sô-cô-la Năng Lượng* — mở rộng cho tên gốc bắt đầu A/E/U trong chế độ Expanded): `Undying` (chữ U) hợp lệ khi chơi ở bộ luật mở rộng; bộ luật Classic giữ nguyên 3 vai gốc (`Allie`, `Emi`, `Unknown`).
- **Balance rationale:** Bù đắp mốc 11 HP thấp của Undying bằng khả năng chịu đòn bền bỉ trước cả đòn đánh lẫn thẻ Đột Kích/kỹ năng, đồng thời giữ counterplay bằng sát thương 1 điểm (Thăm Dò 1 ST, đòn 1 ST).
- **Tests:** `P2B-5`, `P2B-6` (`test/boardgame-phase2b.test.cjs`).
- **Decision status:** `HOUSE_RULE_APPROVED_EXPERIMENTAL`

### RD-2B-05: Experimental Pool `starter-eight` (18 Nhân vật Thử nghiệm Nội bộ)
- **Proposed HUSTVerse rule:** Đăng ký ruleset thử nghiệm nội bộ `starter-eight` (10 Classic + 8 Starter Eight = 18 tướng: 7 Hunter · 7 Shadow · 4 Neutral) với `isExperimental: true`, `enabledInProduction: false`, `allowExperimentalHouseRules: true`. Bị chặn mặc định trên production (`RULESET_UNAVAILABLE`), chỉ mở khi `ALLOW_EXPERIMENTAL_RULESETS=1` trong harness/test/playtest nội bộ.
- **Decision status:** `RATIFIED_EXPERIMENTAL`
