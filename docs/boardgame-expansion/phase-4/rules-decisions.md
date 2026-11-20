# Bóng Đêm KTX — Phase 4 Rules Ratification (`Wave 3 — 10 Tier-2 Characters`)

> **Trạng thái phân loại luật:** Mọi quy tắc dưới đây được phê duyệt với phân loại **`house-rule-approved` (Experimental Implementation Only)** cho ruleset thử nghiệm `starter-twenty-six`. Đây **không phải** luật chính thức Shadow Hunters và không làm thay đổi mô tả nguồn hay sáng tác thêm trích dẫn nguồn; mọi điểm mơ hồ gốc từ [`rules-clarifications.md`](../rules-clarifications.md) vẫn được giữ nguyên bản ghi nhận.

---

## 1. Các Quy chuẩn Chung Bổ sung cho Phase 4 (Global Engine Conventions)

### 1.1. Quy ước HP Còn lại vs Vết thương (Section 4.1)
Bóng Đêm KTX duy trì đồng bộ hai trường trên `AuthoritativePlayerState`: `hp` (máu còn lại, giảm từ `maxHp → 0`) và `woundsTaken` (thương tích đã nhận, tăng từ `0 → maxHp`), luôn đảm bảo bất biến `hp === maxHp - woundsTaken`.
- **Remaining HP (`getRemainingHp(player)`):** `Math.max(0, Math.min(player.maxHp, player.hp))` — dùng thống nhất cho **toàn bộ 10 nhân vật Phase 4** (`Fallen >= 8 remaining HP`, `Fujiko <= 4 remaining HP`).
- **Wounds Taken:** Hiển thị công khai trên mặt thẻ úp (`publicWoundsTaken`) để bảo mật P0 `maxHp` cho tới khi lộ vai.
- **Max HP:** Bất biến theo vai (`8..14`), chỉ lộ khi `revealed || matchFinished`.
- **Damage Received vs Prevented:** `rawAmount` đi qua pipeline phòng thủ (`Guardian Angel`, `Fortune Brooch`, `Talisman`, `Witch`, `Holy Robe`, `G43`, `Undying`), cho ra `actualDealt` (`Math.min(target.hp, finalDmg)`); `damagePrevented = Math.max(0, rawAmount - finalDmg)`.
- **Lethal Damage:** Khi `target.hp - actualDealt <= 0`, xử lý tập trung qua pipeline loại người chơi (`alive = false`, `revealed = true`, `eliminatedByPlayerId`, loot, `ELIMINATION_TRIGGERS`, rồi mới kiểm tra chiến thắng).
- **Voluntary Reveal vs Forced Reveal:** Tự nguyện (`REVEAL_ROLE` hoặc chọn lật vai trong pending choice) tuân thủ điều kiện hạn chế của từng nhân vật (vd. `Fallen` chỉ tự lật khi `hp >= 8`, `Daniel` bị cấm tự lật); Lộ diện bắt buộc (`eliminated`, `eq_mirror`, hoặc hiệu ứng ép lộ diện) luôn thực thi hợp lệ theo server mà không làm hỏng trạng thái trận đấu.

### 1.2. Phạm vi Khu vực `"Cùng khu vực"` (Section 4.2)
- Các kỹ năng ghi tên địa điểm đích danh (`Church → lobby`, `Weird Woods → corridor`, `Erstwhile Altar → court`) dùng **exact location** (`isPlayerAtExactLocationAlias`).
- Toàn bộ kỹ năng Phase 4 ghi **`"cùng khu vực"`** (`Udi`, `Wrath`, `Bryon`) được chuẩn hóa là **cùng Cụm chiến đấu (`combat cluster`)** thông qua `areInSameCluster()` & `listLivingPlayersInSameCluster(state, anchor)` đọc trực tiếp từ `state.clusterPairs` của ván đấu hiện tại (tôn trọng cặp cụm xáo ngẫu nhiên, tuyệt đối không hardcode cặp cố định).

### 1.3. Ánh xạ Thẻ bài Canonical (`CANONICAL_SH_CARD_IDS`, Section 4.3)
Khai báo tập trung tại [`features/boardgame/domain/cards.ts`](../../../features/boardgame/domain/cards.ts):
- `masamune` → `ev-01` (Kiếm Gỗ Nguyền Rủa)
- `vampire_bat` → `ev-07` (Dơi Hút Điện)
- `bloodthirsty_spider` → `ev-08` (Nhện Chập Mạch)
- `dynamite` → `ev-09` (Kíp Nổ Tự Động)
- `spiritual_doll` → `ev-10` (Búp Bê Tâm Linh)
Mọi kiểm tra trong logic kỹ năng/điều kiện thắng dùng ID canonical, không so sánh chuỗi tên dịch tiếng Việt.

### 1.4. Thanh Sô-cô-la (`eq_chocolate` / `eq-14`, Section 4.4)
- **Classic (`rulesetId === 'classic'`):** Giữ nguyên bit-for-bit 3 vai gốc (`lang-quan-sat` / `gac-truc-ban` / `suong-tin-gia`).
- **Expanded (`rulesetId !== 'classic'`):** Suy xuất tự động chữ cái đầu `A / E / U` từ `sourceName` trong `CharacterRegistry` / `EXPANSION_CHARACTER_CATALOG` qua `isEligibleForChocolateHeal(roleId, true)`. (Wave 3 tự động bao gồm `Eleanor` và `Udi` mà không cần thêm ID thủ công.)

### 1.5. Truy vết Sự kiện (Event Attribution, Section 4.5)
Mở rộng `causationId`, `damageEventId`, `sourceCardId`, `preAttackTargetHp`, `preAttackTargetRevealed`, `turnNumberAtElimination` và `ExpansionRuntimeState` để hỗ trợ chuẩn xác `Vengeance`, `Cruz`, `Fujiko`, `Wrath`, `Visions`, giữ nguyên chống đệ quy & idempotency.

---

## 2. Phê duyệt Luật 10 Nhân vật Wave 3

### 2.1. `exp1_fallen` — Fallen (Hunter, 12 HP)
- **Original Source Rule:** *"Bạn chỉ có thể lộ diện khi từ 8 máu trở lên. Miễn là bạn từ 8 máu trở lên khi tấn công thành công thì được tăng thêm 2 sát thương."* (`exp1-hunter.txt`, `RC-15`)
- **Exact Ambiguity:** Nguồn gốc tiếng Việt không rõ `"từ 8 máu trở lên"` là `>= 8 vết thương` (còn `<= 4 HP`, kiểu wound-track Shadow Hunters) hay `>= 8 HP còn lại`.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Quy chuẩn theo **Remaining HP `>= 8`** (`getRemainingHp(fallen) >= 8`). *(Ghi nhận công khai rằng ngưỡng 8 điểm của bản nguồn vẫn là một source-rule ambiguity chưa xác minh chính thức.)*
  2. **Tự nguyện lộ diện (`REVEAL_ROLE`):** Chỉ hợp lệ khi `hp >= 8`. Khi `hp <= 7`, server từ chối `REVEAL_ROLE` với thông báo rõ ràng.
  3. **Lộ diện bắt buộc:** Khi bị loại (`eliminated`) hoặc bị ép lộ diện bởi hiệu ứng hợp lệ, vẫn lộ diện chuẩn server (không vi phạm bất biến P0/trạng thái trận).
  4. **Sát thương cộng thêm:** Sau khi đã lộ diện, mỗi đòn tấn công thường trúng đích (`baseDmg > 0`) khi `fallen.hp >= 8` được cộng **`+2` sát thương** một lần cho mỗi damage instance. Không kích hoạt khi đánh trượt (`baseDmg === 0`), không áp dụng cho sát thương thẻ bài, kỹ năng hay địa điểm.
- **Balance Reasoning:** Tạo bản sắc Hunter kiểm soát sức khỏe sớm/giữa trận: mạnh nếu giữ được máu cao (`>= 8 HP`), dễ bị khắc chế khi Shadow cấu rỉa xuống `<= 7 HP` (vừa tắt `+2` vừa khóa tự lộ diện nếu chưa lật kịp).
- **Engine Hooks:** `applyExpandedRevealRole` (guard `REVEAL_ROLE`), `BEFORE_DAMAGE` outgoing attack modifier (`+2` on hit when `revealed && hp >= 8`).
- **Test Cases:** HP 7/8/9 voluntary reveal; damage before reveal; hit vs miss; weapon/G43/Holy Robe interaction; forced reveal on elimination; non-attack card/location damage unaffected.
- **Approval Classification:** `house-rule-approved`.

### 2.2. `exp1_fea` — Fea (Hunter, 12 HP)
- **Original Source Rule:** *"Bạn có thể tăng hoặc giảm 1 nút cho mỗi lần gieo xúc xắc di chuyển."* (`exp1-hunter.txt`, `RC-17`)
- **Exact Ambiguity:** Chưa rõ yêu cầu lộ diện, xử lý biên tổng `2 → 1` / `10 → 11`, chỉnh vào hoặc rời khỏi tổng `7` (`choose-any`), tương tác với `Mystic Compass` (`eq-05`) và luật cấm đứng yên tại ô cũ.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Yêu cầu đã lộ diện (`revealed === true`).
  2. Sau khi server tung xúc xắc di chuyển (`d6 + d4`), nếu Fea không đeo `Mystic Compass` (hoặc sau khi tung xúc xắc đơn), server mở `PendingChoice` (`fea_move_adjust`, `isSecret: false`) cho phép chọn **`-1`**, **`0` (giữ nguyên)**, hoặc **`+1`** — chỉ liệt kê các phương án nằm trong khoảng hợp lệ **`[2..10]`** và không dẫn tới việc đứng yên bất hợp lệ nếu có ô đích hợp lệ khác (hoặc cho phép giữ `0` để đi qua nhánh đổ lại trùng ô đúng luật Classic).
  3. Nếu tổng sau chỉnh là **`7`**, kích hoạt ngay pha `CHOOSE_MOVE` (`choose-any`, trừ ô hiện tại). Nếu tổng gốc là `7` và Fea chọn `-1` (`6 → lobby`) hoặc `+1` (`8 → canteen`), di chuyển thẳng tới ô đích mới (nếu khác ô hiện tại).
  4. Không tung thêm xúc xắc; tối đa 1 lần điều chỉnh cho mỗi lần tung di chuyển; hết hạn timeout mặc định chọn `0` (giữ nguyên tổng xúc xắc gốc).
  5. Không xung đột với `Father Harrison` (vì Harrison dùng `USE_SKILL` thay cho `ROLL_DICE`).
- **Balance Reasoning:** Mang lại khả năng điều hướng địa điểm chiến thuật rất linh hoạt (né bẫy, bước vào `lobby`/`corridor`/`court`, ép ra `7`) mà không phá vỡ phân bố RNG gốc hay luật chống đứng yên.
- **Engine Hooks:** `applyExpandedDiceRollMove` (`ON_MOVE`), `PendingChoiceKind = 'fea_move_adjust'`.
- **Test Cases:** Biên `2` (không có `-1`) và `10` (không có `+1`); chỉnh `6→7`, `8→7`, `7→6`, `7→8`; luật cấm đứng yên; deterministic RNG; reconnect/duplicate choice; timeout giữ nguyên tổng gốc; không ảnh hưởng Father Harrison.
- **Approval Classification:** `house-rule-approved`.

### 2.3. `exp2_eleanor` — Eleanor (Hunter, 10 HP)
- **Original Source Rule:** *"Trong giai đoạn tấn công, bạn có thể rút 'Thẻ bài xanh lá' thay vì chọn tấn công."* (`exp2-hunter.txt`, `RC-19`)
- **Exact Ambiguity:** Chưa rõ yêu cầu lộ diện, có được dùng khi không có mục tiêu trong tầm đánh không, có bỏ qua ép đánh của `Masamune` (`ev-01`) không, và lá bài Xanh rút ra giải quyết ngay trong lượt hay giữ qua lượt.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Yêu cầu đã lộ diện (`revealed === true`).
  2. Trong pha `MAIN_ACTION`, khi `attacksThisTurn === 0` và `hand.length === 0` (không còn bài chờ giải quyết), Eleanor có thể dùng `USE_SKILL` để rút 1 lá **Khám Phá (`investigation` / Green)** qua pipeline rút bài authoritative thay cho đòn tấn công.
  3. Tiêu hao quyền tấn công lượt này (`attacksThisTurn = 1`), và lá Xanh vừa rút phải được đưa cho 1 người chơi khác qua `INVESTIGATE_CARD` trong chính lượt đó (giữ nguyên 100% bảo mật 1-đối-1).
  4. **Được phép dùng ngay cả khi không có mục tiêu nào trong tầm tấn công** (miễn `MAIN_ACTION` hợp lệ và chưa mất lượt đánh).
  5. **Không được vượt qua yêu cầu bắt buộc tấn công của `Masamune` (`ev-01`)** khi Eleanor đang đeo `ev-01` và có ít nhất 1 mục tiêu tấn công hợp lệ trong tầm.
  6. Không dùng được sau khi đã tấn công (`attacksThisTurn >= 1`). Nếu chồng bài Xanh cạn sạch cả deck lẫn discard, vẫn xử lý an toàn không treo ván.
- **Balance Reasoning:** 10 HP thấp khiến Eleanor là Hunter trinh sát thuần túy — cung cấp thông tin phe cực giá trị cho đồng đội mà không phá vỡ ràng buộc lời nguyền Masamune hay chu kỳ kết thúc lượt.
- **Engine Hooks:** `applyExpandedUseSkill` (`MAIN_ACTION`, `ACTIVE_SKILL`), `takeOneCardFromDeck(state, 'investigation')`.
- **Test Cases:** Dùng khi không có mục tiêu; tiêu hao quyền tấn công; bị chặn khi đã đánh; bị chặn khi cầm Masamune có mục tiêu (vẫn dùng được nếu cầm Masamune nhưng không có mục tiêu hợp lệ); bảo mật P0 thẻ Xanh; cạn deck; reconnect.
- **Approval Classification:** `house-rule-approved`.

### 2.4. `exp2_fujiko` — Fujiko (Hunter, 12 HP)
- **Original Source Rule:** *"Đòn tấn công thành công của bạn sẽ ngay lập tức hạ gục 1 nhân vật đã lộ diện chỉ còn 4 máu."* (`exp2-hunter.txt`, `RC-15`)
- **Exact Ambiguity:** Chưa rõ `"chỉ còn 4 máu"` là `<= 4 HP` hay `=== 4 HP`, kiểm tra trước hay sau đòn đánh, và khi bị giảm sát thương về `0` (như `G43 + Holy Robe` / `Witch` / `Guardian Angel`) có kết liễu không.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Fujiko phải **đã lộ diện** và mục tiêu cũng phải **đã lộ diện** ngay trước đòn tấn công (`preAttackTargetRevealed === true`).
  2. Mục tiêu phải có **`<= 4` HP còn lại ngay trước đòn tấn công** (`preAttackTargetHp <= 4`).
  3. Đòn tấn công phải trúng (`baseDmg > 0`) **VÀ** gây được **ít nhất `1` sát thương thực sự (`actualDealt >= 1`)** sau toàn bộ cơ chế giảm/miễn sát thương (`Guardian Angel`, `Witch`, `Holy Robe`, `G43`, `Undying`).
  4. Khi thỏa đủ các điều kiện trên và mục tiêu vẫn còn `hp > 0`, phần kết liễu còn lại được thực thi qua **chính pipeline loại chuẩn** (trừ nốt phần HP còn lại bằng sát thương không thể chặn trong cùng sự kiện `attack`, kích hoạt đầy đủ `alive = false`, loot, `Silver Rosary`, `ELIMINATION_TRIGGERS` (`Wendigo`, `Vengeance`, `Wyvern`), rồi kiểm tra thắng) — **tuyệt đối không gán trực tiếp `alive = false`**.
  5. Trong tấn công đa mục tiêu (`Machine Gun`), kiểm tra độc lập cho từng mục tiêu thỏa `preAttackTargetRevealed && preAttackTargetHp <= 4 && actualDealt >= 1`.
- **Balance Reasoning:** Tạo vai trò sát thủ kết liễu sắc bén đối trọng tốt với các tướng phòng thủ dày máu khi máu tụt `<= 4`, nhưng vẫn có counterplay rõ ràng (giữ ẩn vai, giữ `HP >= 5`, hoặc chặn sạch sát thương về `0` bằng `G43 + Holy Robe` / `Witch` / `Guardian Angel`).
- **Engine Hooks:** `enqueueAttackResolution` (chụp `preAttackTargetHp` & `preAttackTargetRevealed`), `executeDamageStep` (kết liễu qua pipeline chung khi `actualDealt >= 1`).
- **Test Cases:** Mục tiêu `4 HP` vs `5 HP`; mục tiêu ẩn vs lộ diện; `G43 + Holy Robe` chặn về `0` (không kết liễu) vs lọt `>= 1` (kết liễu); `Witch` tại `corridor` (chặn về `0`, không kết liễu); `Undying` giảm 2→1 vẫn lọt `1` (kết liễu); `Machine Gun` đa mục tiêu; chuỗi `ON_ELIMINATION` (`Wendigo`, `Silver Rosary`).
- **Approval Classification:** `house-rule-approved`.

### 2.5. `exp1_udi` — Udi (Shadow, 11 HP)
- **Original Source Rule:** *"Bạn không thể bị tấn công khi có 2 hoặc nhiều người chơi khác đang ở cùng khu vực với bạn."* (`exp1-shadow.txt`, `RC-10`, `RC-17`)
- **Exact Ambiguity:** Chưa rõ yêu cầu lộ diện, phạm vi `"cùng khu vực"` (`Location` hay `Cluster`), và tương tác với `Machine Gun` (`ev-06`), `Handgun` (`ev-05`), `Werewolf` phản công.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Yêu cầu đã lộ diện (`revealed === true`).
  2. Đếm số **người chơi khác còn sống** đứng **cùng Cụm chiến đấu** với Udi (`listLivingPlayersInSameCluster(state, udi, { includeSelf: false }).length >= 2`, dùng `state.clusterPairs`).
  3. Khi thỏa `>= 2` người khác cùng cụm, Udi **không phải là mục tiêu hợp lệ của mọi đòn tấn công trực tiếp** (cả đơn mục tiêu, `Handgun` bắn từ cụm khác, `Machine Gun` đánh diện rộng, và phản công của `Werewolf`). Bảo vệ được cưỡng chế trực tiếp trên server (`listLegalAttackTargets`), không chỉ ẩn ở UI.
  4. Sát thương từ **thẻ bài** (`Flare`, `Dynamite`, `Vampire Bat`, `Spider`, `Spiritual Doll`), **kỹ năng** (`George`, `Franklin`, `Wrath`, `Vengeance`, `Visions`), **phản sát thương** (`Cindy`), và **địa điểm** (`corridor` Ô 9) vẫn tác động bình thường.
  5. Bảo vệ chấm dứt ngay lập tức khi số người chơi khác còn sống cùng cụm giảm xuống `< 2` (do di chuyển hoặc bị hạ gục). Không tạo khiên HP hay cộng dồn giảm sát thương.
- **Balance Reasoning:** 11 HP rất mỏng; kỹ năng ẩn thân trong đám đông mang lại lối chơi định vị cực thú vị cho phe Shadow mà vẫn mở rộng đường khắc chế bằng bài/kỹ năng/Ô 9 hoặc tỉa bớt người trong cụm.
- **Engine Hooks:** `isUdiProtectedFromAttack(state, target)`, tích hợp vào `listExpandedReachableAttackTargets` (dùng cho `ATTACK`, `Machine Gun`, `Masamune` check, và `COUNTER_ATTACK`).
- **Test Cases:** `0/1/2/3` người khác cùng cụm (kể cả cụm đã xáo); `Handgun` từ cụm khác bị chặn; `Machine Gun` loại Udi khỏi danh sách nạn nhân; `Werewolf` không phản công được Udi đang được che chở; hạ gục 1 người trong cụm làm Udi mất bảo vệ ở đòn sau; sát thương thẻ/kỹ năng/Ô 9 vẫn trúng bình thường.
- **Approval Classification:** `house-rule-approved`.

### 2.6. `exp1_wrath` — Wrath (Shadow, 14 HP)
- **Original Source Rule:** *"Bắt đầu lượt của bạn, bạn có thể cho tất cả người chơi đang ở cùng khu vực của bạn nhận 2 sát thương."* (`exp1-shadow.txt`, `RC-10`, `RC-17`)
- **Exact Ambiguity:** Chưa rõ yêu cầu lộ diện, phạm vi `"cùng khu vực"`, có đánh trúng chính Wrath không, và thứ tự giải quyết phản ứng/chiến thắng khi hạ gục nhiều người cùng lúc.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Yêu cầu đã lộ diện (`revealed === true`).
  2. Tùy chọn **1 lần vào đầu mỗi lượt của Wrath** (`ON_TURN_START`, trước khi tung xúc xắc di chuyển ở `ROLL_MOVE`), nếu có ít nhất 1 người chơi khác còn sống đứng **cùng Cụm chiến đấu** với Wrath. Mở `PendingChoice` (`wrath_turn_start_aoe`, `isSecret: false`) với 2 lựa chọn: `activate` (gây `2` sát thương kỹ năng cho toàn bộ người khác trong cụm) hoặc `skip` (timeout mặc định `skip`).
  3. **Không gây sát thương cho chính Wrath.**
  4. Gây `2` sát thương nguồn **`'skill'`** lần lượt từng mục tiêu theo thứ tự ghế deterministic (`state.turnOrder`) qua pipeline `DAMAGE` chuẩn — cho phép đầy đủ miễn nhiễm (`Witch` tại `corridor`), giảm sát thương (`Undying >= 2`), phản sát thương (`Cindy`), và `ELIMINATION_TRIGGERS` (`Wendigo`, `Vengeance`) trước khi kết luận thắng thua.
  5. Ghi dấu `wrathPromptedTurnNumber = state.turnNumber` để chống kích hoạt lặp trong cùng lượt.
- **Balance Reasoning:** Gây áp lực diện rộng mạnh (kể cả lên đồng đội nếu đứng cùng cụm!), tạo thế buộc đối thủ phân tán vị trí và là nguồn sát thương kỹ năng khắc chế `G43` hợp lệ.
- **Engine Hooks:** `triggerExpandedTurnStart` (`ON_TURN_START`), `PendingChoiceKind = 'wrath_turn_start_aoe'`, `DAMAGE` (`sourceType: 'skill'`).
- **Test Cases:** Multi-elimination đồng thời; không tự đánh bản thân; tương tác `Cindy`, `Witch` tại `corridor`, `Undying`, `Wendigo`; `G43` không giảm được sát thương `'skill'`; không lặp lại khi hồi phục/reconnect cùng lượt; timeout `skip`.
- **Approval Classification:** `house-rule-approved`.

### 2.7. `exp1_vengeance` — Vengeance (Shadow, 13 HP)
- **Original Source Rule:** *"Sau khi bạn giết được bất kỳ người chơi khác, bạn có thể chọn 2 người chơi khác để nhận sát thương với xúc xắc 4 mặt. (Chỉ sử dụng 1 lần)"* (`exp1-shadow.txt`, `RC-18`)
- **Exact Ambiguity:** Chưa rõ đổ 1 hay 2 xúc xắc d4, xử lý khi trên bàn chỉ còn 1 người chơi khác còn sống, và thứ tự khi kích hoạt cùng lúc với các `ON_ELIMINATION` khác (`Wendigo`, thắng thua).
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Yêu cầu đã lộ diện (`revealed === true`), chưa dùng lần duy nhất (`!skillUsedOnce`), và Vengeance phải được ghi nhận là **người kết liễu (`killerPlayerId === vengeance.playerId`)** một người chơi khác.
  2. Kích hoạt tại `ELIMINATION_TRIGGERS` (priority 15 — sau `Wyvern`, trước `Wendigo` và trước khi kết thúc trận nếu vẫn còn mục tiêu hợp lệ).
  3. Tìm danh sách người chơi khác còn sống (`alive && playerId !== vengeance.playerId`):
     - Nếu có **`0`** mục tiêu: không mở choice, không tiêu hao `skillUsedOnce`.
     - Nếu có **`1`** mục tiêu: cho phép chọn kích hoạt lên đúng `1` mục tiêu đó hoặc bỏ qua (`skip`).
     - Nếu có **`>= 2`** mục tiêu: mở `PendingChoice` (`vengeance_chain_strike`, `isSecret: false`) cho phép chọn cặp **`2` mục tiêu phân biệt** (mã hóa `targets:idA|idB`) hoặc `skip` (timeout mặc định `skip`).
  4. **Chỉ tiêu hao `skillUsedOnce = true` sau khi người chơi xác nhận kích hoạt hợp lệ** (chọn `skip`/timeout không làm mất lượt dùng 1 lần/trận!).
  5. Khi kích hoạt: server tung **đúng 1 xúc xắc `1d4` duy nhất** và đẩy lần lượt từng bước `DAMAGE` (`sourceType: 'skill'`, cùng kết quả `d4`) theo thứ tự ghế vào pipeline chuẩn (hỗ trợ `Witch`, `Undying`, `Cindy`, `Wendigo`). Vì `skillUsedOnce` đã commit trước khi chạy damage, tuyệt đối không kích hoạt đệ quy.
  6. Trạng thái choice thuần JSON, sống sót 100% qua DO hibernation / F5 reconnect.
- **Balance Reasoning:** Tạo chuỗi bùng nổ dứt điểm đặc trưng của Shadow mà vẫn giữ rủi ro công bằng (1 lần/trận, chỉ 1d4, phải tự tay kết liễu sau khi đã lộ diện).
- **Engine Hooks:** `ELIMINATION_TRIGGERS` (`ON_ELIMINATION`), `PendingChoiceKind = 'vengeance_chain_strike'`.
- **Test Cases:** 0 mục tiêu, 1 mục tiêu, >= 2 mục tiêu; 1d4 chung cho cả 2 mục tiêu; `skip`/timeout bảo toàn `skillUsedOnce`; chống đệ quy khi giết thêm người; tương tác `Witch`/`Undying`/`Cindy`/`Wendigo`; multi-kill đồng thời; DO hibernation.
- **Approval Classification:** `house-rule-approved`.

### 2.8. `exp2_visions` — Visions (Shadow, 13 HP)
- **Original Source Rule:** *"Chọn một nhân vật vào đầu lượt của bạn. Bạn không thể tấn công nhân vật này nữa, và suốt phần còn lại của trò chơi, nhân vật bạn chọn sẽ mất 1 máu vào đầu lượt của bạn. (Chỉ sử dụng 1 lần)."* (`exp2-shadow.txt`, `RC-18`)
- **Exact Ambiguity:** Chưa rõ có trừ 1 máu ngay ở lượt chọn không, tương tác lệnh cấm tấn công với `Machine Gun` (`ev-06`) và `Masamune` (`ev-01`), và khi mục tiêu chết có chọn lại được không.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. Yêu cầu đã lộ diện (`revealed === true`).
  2. **1 lần/trận (`!skillUsedOnce`) vào đầu lượt Visions (`ON_TURN_START` / `ROLL_MOVE`):** Mở `PendingChoice` (`visions_mark_target`, `isSecret: false`) cho phép chọn 1 người chơi khác còn sống (`mark:<playerId>`) hoặc `skip` (chưa dùng lần này, timeout mặc định `skip`).
  3. Lưu dấu ấn bền vững trong `expansionState.visionsMarks[visionsId] = { targetPlayerId, markedOnTurnNumber: state.turnNumber }` (đồng thời đặt `skillUsedOnce = true`, không đổi mục tiêu được nữa).
  4. **Lần trừ máu đầu tiên bắt đầu ở lượt TIẾP THEO của Visions**, không trừ ngay ở lượt vừa đặt dấu (`markedOnTurnNumber < state.turnNumber`). Vào đầu mỗi lượt tiếp theo của Visions, khi cả Visions và mục tiêu đều còn sống, mục tiêu nhận **`1` sát thương kỹ năng (`sourceType: 'skill'`)** qua pipeline chuẩn (tôn trọng `Witch` tại `corridor`, `Cindy` phản kích; không kích hoạt `Undying` vì `1 < 2`; không bị `G43` chặn vì là `'skill'`). Nếu sát thương này giết mục tiêu, kích hoạt đầy đủ `ELIMINATION_TRIGGERS` & kiểm tra thắng ngay!
  5. **Cấm tấn công trực tiếp mục tiêu bị đánh dấu:** Loại trừ mục tiêu bị đánh dấu khỏi `listExpandedReachableAttackTargets` cho cả đòn đơn mục tiêu lẫn **`Machine Gun` (`ev-06`)**. Nếu Visions đeo **`Masamune` (`ev-01`)** và chỉ còn duy nhất mục tiêu bị đánh dấu trong tầm, danh sách mục tiêu hợp lệ rỗng (`[]`) nên Visions không bị kẹt lượt (`END_TURN` hợp lệ)!
  6. Khi mục tiêu bị đánh dấu chết, dấu ấn tự động ngưng hiệu lực và không được chọn mục tiêu mới. Hoàn toàn gắn theo tiến trình lượt, không dùng background timer ngoài lượt.
- **Balance Reasoning:** Áp lực cấu máu chắc chắn 1 HP/vòng (đặc biệt khắc chế `G43` và `Allie`!), đánh đổi bằng việc không thể đánh thường trực tiếp nạn nhân đó.
- **Engine Hooks:** `triggerExpandedTurnStart` (tick dấu ấn + prompt chọn dấu ấn), `PendingChoiceKind = 'visions_mark_target'`, `listExpandedReachableAttackTargets`.
- **Test Cases:** Không trừ máu ở lượt chọn; trừ 1 skill damage mỗi đầu lượt tiếp theo; cấm đánh đơn & loại khỏi `Machine Gun`; tương tác `Masamune` (khi chỉ còn mục tiêu bị đánh dấu -> không deadlock); mục tiêu chết thì tắt dấu & không retarget; tương tác `Witch`/`Cindy`/`G43`; reconnect/DO hibernation; turn timeout.
- **Approval Classification:** `house-rule-approved`.

### 2.9. `exp2_cruz` — Cruz (Neutral, 11 HP)
- **Original Source Rule:** *"Khi bạn rút thẻ bài đen, bạn có thể chọn đặt nó tại cuối chồng bài và rút 1 thẻ khác để thay thế."* | **Thắng:** *"Hạ gục một nhân vật khi dùng hoặc sau khi dùng các lá bài 'Bloodthirsty Spider', 'Dynamite', 'Spiritual Doll' hoặc 'Vampire Bat' trong cùng lượt."* (`exp2-neutral.txt`, `RC-10`, `RC-19`)
- **Exact Ambiguity:** Chưa rõ giới hạn số lần đổi mỗi lần rút bài Đen (tránh lặp vô hạn), xử lý cạn bài Đen, ánh xạ 4 lá bài Đen sang ID KTX, và quy tắc ghi nhận công hạ gục trong lượt.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. **Kỹ năng đổi bài Đen:** Yêu cầu đã lộ diện (`revealed === true`). Khi Cruz rút một lá Đen (`deck === 'event'`) tại `canteen` hoặc `breaker` (và còn ít nhất 1 lá khác để rút sau khi đặt lá cũ xuống đáy — hoặc deck + discard có lá thay thế), server mở `PendingChoice` (`cruz_black_redraw`, `isSecret: false`) cho phép chọn `keep` (giữ & giải quyết lá vừa rút — mặc định timeout) hoặc `redraw` (đưa lá vừa rút xuống **đáy chồng bài `decks.event`** và rút 1 lá mới từ đỉnh deck).
  2. **Tối đa 1 lần thay thế cho mỗi lần rút bài Đen** (lá mới rút ra không bao giờ kích hoạt đệ quy thêm choice Cruz). Giữ nguyên thứ tự deck deterministic và quy tắc xào discard khi deck rỗng.
  3. **Điều kiện thắng (Individual — Solo Immediate Trigger):**
     - Theo dõi `cruzQualifyingCardTurnByPlayer[cruzId] = state.turnNumber` khi Cruz kích hoạt bất kỳ lá nào trong `CRUZ_QUALIFYING_CARD_IDS` (`ev-07` Vampire Bat, `ev-08` Bloodthirsty Spider, `ev-09` Dynamite, `ev-10` Spiritual Doll) trong lượt đó.
     - Nếu trong **chính lượt `state.turnNumber` đó** (khi dùng lá bài hoặc trong hành động sau đó như đòn tấn công cùng lượt), có bất kỳ người chơi **khác** bị hạ gục với **quy kết killer thuộc về Cruz (`killerPlayerId === cruzId`)**, ghi nhận `cruzWinTriggeredIds.push(cruzId)` → Cruz thỏa thắng cá nhân tức thì (đánh giá cả trước/sau pending choice trong chuỗi giải quyết)!
     - Cái chết do người khác gây ra (ví dụ phản kích từ người khác hoặc đối thủ tự sát không do Cruz) **không** tính cho Cruz; điều kiện lượt không bao giờ mang sang lượt tiếp theo.
- **Balance Reasoning:** Tạo bản sắc Neutral săn bài Đen đầy phấn khích, giới hạn 1 lần đổi/lần rút ngăn tình trạng lọc sạch bộ bài, và quy kết killer chặt chẽ đảm bảo công bằng tuyệt đối.
- **Engine Hooks:** `applyExpandedDrawLocationCard`, `PendingChoiceKind = 'cruz_black_redraw'`, `applyExpandedUseCard` (ghi nhận `cruzQualifyingCardTurnByPlayer`), `ELIMINATION_TRIGGERS` (kiểm tra quy kết killer & `turnNumber`), `evaluateExpandedVictory` (`cruzSoloWinners`).
- **Test Cases:** Cả 4 lá `ev-07`, `ev-08`, `ev-09`, `ev-10`; giết trực tiếp bằng lá bài vs giết bằng đòn tấn công sau khi dùng lá bài cùng lượt; không tính nếu giết ở lượt sau; không tính nếu người khác giết trong lượt Cruz; đổi bài Đen đặt đúng đáy deck + không đệ quy; deck cạn 0/1 lá; tương tác với `Felicia` trên cùng bàn.
- **Approval Classification:** `house-rule-approved`.

### 2.10. `exp2_bryon` — Bryon (Neutral, 10 HP)
- **Original Source Rule:** *"Trước khi bạn tấn công, bạn có thể tự do trao tặng bất kỳ số lượng trang bị của bản thân mình cho nhân vật Neutral đã lộ diện ở cùng khu vực với mình. Ngoại trừ 'Masamune'."* | **Thắng:** *"Không có Neutral nào chết khi trò chơi kết thúc."* (`exp2-neutral.txt`, `RC-10`, `RC-17`)
- **Exact Ambiguity:** Chưa rõ phạm vi `"cùng khu vực"`, có tặng được nếu sau đó không tấn công không, cơ chế chọn nhiều trang bị nguyên tử trên multiplayer, và trường hợp ván 5P Bryon là Neutral duy nhất.
- **HUSTVerse Experimental House Rule (`house-rule-approved`):**
  1. **Kỹ năng tặng trang bị:** Yêu cầu đã lộ diện (`revealed === true`). Trong cửa sổ hợp lệ **trước khi tấn công** (`MAIN_ACTION`, `attacksThisTurn === 0`, `hand.length === 0`), Bryon có thể dùng `USE_SKILL` (hoặc chọn tặng từng trang bị / toàn bộ trang bị hợp lệ) để chuyển giao **tùy ý số lượng** trang bị đang sở hữu (**ngoại trừ `ev-01` Masamune**) cho một **người chơi khác còn sống, thuộc phe Neutral (`wanderer`), đã lộ diện (`revealed === true`), và đứng cùng Cụm chiến đấu (`areInSameCluster`)**.
  2. Server xác thực đầy đủ quyền sở hữu, loại trừ `ev-01`, tư cách Neutral đã lộ diện cùng cụm; mỗi giao dịch chuyển đồ là **nguyên tử và idempotent** (hỗ trợ tặng nhiều lần liên tiếp trong cùng cửa sổ tiền-tấn công hoặc chuyển 1 lần qua `PendingChoice` `bryon_gift_equipment`, không nhân bản hay mất đồ khi reconnect).
  3. **Bảo toàn quyền tấn công:** Việc tặng trang bị không tiêu hao `attacksThisTurn` — Bryon vẫn có quyền tấn công bình thường (hoặc kết thúc lượt nếu không bị ép bởi Masamune).
  4. **Điều kiện thắng (End-of-Match Shared/Conditional):**
     - Chỉ đánh giá **khi trận đấu kết thúc hợp lệ** (KHÔNG tự thắng ngay đầu trận!).
     - Bryon phải **còn sống** VÀ **toàn bộ các nhân vật phe Neutral trong ván (bao gồm Bryon) đều còn sống (`wanderers.every(w => w.alive)`)**.
     - Trong ván **5 người** (Bryon là Neutral duy nhất): nếu Bryon còn sống khi trận kết thúc hợp lệ, Bryon đồng thắng theo diễn giải thử nghiệm này *(được ghi nhận rõ trong mục rủi ro cân bằng cần kiểm tra tỷ lệ thắng 5P ở Phase 4D)*.
- **Balance Reasoning:** Tạo vai trò hỗ trợ đồng minh Neutral độc đáo (phối hợp cực mạnh với `Bob` 5 trang bị hoặc giúp `Allie`/`Cindy` mặc giáp sống sót!), nhưng lại khiến Shadow có động cơ lớn để săn bất kỳ 1 Neutral nào.
- **Engine Hooks:** `applyExpandedUseSkill` (`MAIN_ACTION` pre-attack window), `PendingChoiceKind = 'bryon_gift_equipment'`, `qualifiesClassicOrExpandedWanderer` trong `victory-engine.ts`.
- **Test Cases:** Tặng 1 trang bị; tặng nhiều trang bị liên tiếp; chặn tặng `ev-01` (Masamune); chặn tặng Neutral chưa lộ diện; chặn tặng Hunter/Shadow; chặn tặng khác cụm; bảo toàn quyền tấn công sau khi tặng; tặng xong `Bob` đủ 5 trang bị thắng ngay; điều kiện thắng Bryon (0 Neutral chết -> thắng, 1 Neutral chết -> thua, 5P không auto-win đầu trận -> co-win cuối trận); idempotency & reconnect.
- **Approval Classification:** `house-rule-approved`.
