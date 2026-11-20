# Bóng Đêm KTX — Phase 5 Rules Ratification (`Wave 4 — 12 Characters: 4 Tier-2 + 8 Tier-3`)

> **Trạng thái phân loại luật:** Toàn bộ 12 nhân vật dưới đây được phê duyệt theo phân loại **`house-rule-approved` (Experimental Implementation Only)** cho bộ luật thử nghiệm `starter-thirty-eight`. Không nhân vật nào bị tự ý gán nhãn `verified` nếu nguồn gốc còn điểm mơ hồ; nguyên văn mô tả kỹ năng, `sourceUrl`, phe và HP trong [`character-catalog.json`](../character-catalog.json) được giữ nguyên 100%.

---

## Phần I — 4 Nhân vật Tier-2 Cuối cùng (Phase 5B)

### 1. `exp2_elise` — Elise (Hunter, 10 HP · Expansion 2)
- **SOURCE_RULE:** *"Âm Hưởng Mềm Mại: Phân phát 5 máu cho tất cả các nhân vật ở cùng khu vực với bạn, bao gồm cả bản thân. (Chỉ sử dụng 1 lần)"* | Thắng: *"Tất cả Shadow bị tiêu diệt."* (`exp2-hunter`)
- **SOURCE_AMBIGUITY:** `RC-08` & `RC-10` — Bài nguồn mâu thuẫn trực tiếp giữa mô tả kỹ năng (*"Phân phát 5 máu"*, tổng quỹ 5 điểm) và đoạn Ưu điểm (*"hồi 5 máu cho tất cả mọi người"*); đồng thời chưa chốt phạm vi `"cùng khu vực"` (`Location` vs `Cluster`) và thời điểm dùng trong lượt.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`); kích hoạt trong lượt của Elise (`ROLL_MOVE`, `LOCATION_ACTION`, hoặc `MAIN_ACTION` khi `hand.length === 0`).
  - Quỹ phân bổ là **tổng tối đa 5 điểm hồi máu hiệu lực** (không phải 5 HP mỗi người), chia tùy ý cho các người chơi còn sống đứng **cùng Cụm chiến đấu** với Elise (bao gồm chính Elise).
  - Không bao giờ hồi vượt quá `maxHp` của người nhận; điểm dư không dùng sẽ bị hủy.
  - Commit phân bổ nguyên tử và **chỉ tiêu hao `skillUsedOnce = true` khi xác nhận kích hoạt hợp lệ** (chọn hủy / timeout giữ nguyên 1 lần/trận).
  - Toàn bộ điểm hồi máu đi qua `HealPipeline` (`sourceKind: 'skill'`, `actorPlayerId: eliseId`) — do đó `Usurper` có thể chặn và `Dalton` (nếu nhận từ Elise) vẫn được hồi trừ khi bị `Usurper` chặn.
- **ENGINE_DECISION:** `applyExpandedUseSkill` mở `PendingChoice` (`elise_distribute_heal`, `isSecret: false`, short `optionId`s `e_0..e_k` + `skip`) với bảng phân bổ JSON trong `PendingChoiceContextData`; khi xác nhận, đặt `skillUsedOnce = true` và đẩy chuỗi `HEAL` step theo thứ tự ghế deterministic.
- **TEST_REQUIREMENT:** Đầy máu toàn cụm (0 điểm hiệu lực), phân bổ 1 phần (dư bị hủy), chia nhiều người trong cụm, ngắt kết nối/timeout khi đang chọn (không mất lượt dùng), và tương tác chặn hồi máu của `Usurper`.

### 2. `exp2_umibozu` — Umibozu (Shadow, 11 HP · Expansion 2)
- **SOURCE_RULE:** *"(Lật úp): Khi nhân vật này đã lộ diện, tự nguyện hoặc bị ép, gây 3 sát thương cho toàn bộ nhân vật ở cùng khu vực với bạn. (Chỉ sử dụng 1 lần)."* | Thắng: Shadow chuẩn (`exp2-shadow`)
- **SOURCE_AMBIGUITY:** `RC-10` & `RC-11` — Bài nguồn thiếu tên kỹ năng chuẩn, chưa rõ có tự đánh bản thân hay không, phạm vi `"cùng khu vực"`, và có kích hoạt khi bị lộ do chết không.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Kích hoạt **đúng 1 lần/trận** khi Umibozu chuyển trạng thái từ ẩn sang lộ diện **trong lúc còn sống** (cả tự nguyện `REVEAL_ROLE` lẫn bị ép lộ diện như `Ernest`, `eq_mirror`, `ev_diabolic_ritual`).
  - **Không** kích hoạt khi lộ diện do bị loại (`eliminated`) hay khi mở bảng tổng kết cuối trận (`finalReveal`).
  - Gây **`3` sát thương kỹ năng (`sourceType: 'skill'`, `isSingleTarget: false`)** cho toàn bộ **người chơi khác còn sống** đứng **cùng Cụm chiến đấu** với Umibozu; **không** gây sát thương cho chính Umibozu.
  - Xếp hàng AoE deterministic theo `state.turnOrder`, xử lý đầy đủ `Witch`, `G43` (không chặn `'skill'`), `Undying`, `Cindy`, `Angel`, `Dalton`, `Wendigo`, `Vengeance` và kiểm tra thắng.
- **ENGINE_DECISION:** Đẩy `ROLE_REVEALED_TRIGGERS` mỗi khi một nhân vật sống chuyển `hidden -> revealed`; khóa `umibozuTriggeredIds` & `skillUsedOnce = true` trước khi xếp hàng `DAMAGE` để chống vòng lặp đệ quy tuyệt đối.
- **TEST_REQUIREMENT:** Tự nguyện lộ diện, bị `Ernest` ép lộ diện, lộ diện do chết (không kích hoạt), nhiều người chết cùng lúc, tương tác `Witch`/`G43`/`Undying`/`Cindy`/`Bianca` (AoE bị loại trừ khỏi Bianca), chống vòng lặp lộ diện.

### 3. `exp2_urban_legend` — Urban Legend (Shadow, 11 HP · Expansion 2)
- **SOURCE_RULE:** *"Chuyện Kinh Dị: Hiệu ứng gây sát thương của thẻ bài đen 'Dùng một lần' sẽ hồi máu cho bạn thay vì mất máu. Bạn có thể tiết lộ bản thân khi hiệu ứng được giải quyết."* | Thắng: Shadow chuẩn (`exp2-shadow`)
- **SOURCE_AMBIGUITY:** `RC-19` — Chưa rõ áp dụng khi người khác dùng thẻ Đen lên Urban Legend hay chỉ khi tự rút, các lá hợp lệ, và xử lý tác dụng phụ của thẻ (`Vampire Bat`, `Spider`, `Dynamite`).
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Chỉ áp dụng cho các lá **thẻ Đen dùng 1 lần gây sát thương** đã xác minh qua `CANONICAL_SH_CARD_IDS`: `ev-07` (*Vampire Bat*), `ev-08` (*Bloodthirsty Spider* — cả mục tiêu lẫn tự dính), `ev-09` (*Dynamite*), `ev-10` (*Spiritual Doll* — cả mục tiêu lẫn phản tác dụng), `ev-12` (*Banana Peel* khi không có đồ chịu 1 ST). Tuyệt đối **không** áp dụng cho vũ khí/trang bị Đen vĩnh viễn (`ev-01..ev-06`).
  - Nếu đã lộ diện: tự động chuyển hóa sát thương thành hồi máu tương ứng (`sourceKind: 'black-card'`, đi qua `HealPipeline`, không vượt quá `maxHp`, không bị `Usurper` chặn).
  - Nếu đang ẩn vai: mở lựa chọn bí mật riêng tư (`urban_legend_reveal_heal`, `isSecret: true`, tôn trọng `reactionPolicy` `ASK` / `AUTO_DECLINE` / `AUTO_ACTIVATE_WHEN_ELIGIBLE`). Nếu từ chối/timeout, nhận sát thương như bình thường mà không ghi log lộ tên.
  - Sát thương đã chuyển hóa thành hồi máu **không** kích hoạt `AFTER_DAMAGE_TRIGGERS` (`Cindy`), không gây chết và không kích hoạt `ON_ELIMINATION`; hiệu ứng gốc của thẻ lên những người chơi khác (như `Vampire Bat` hồi 1 HP cho người dùng hay `Dynamite` nổ lên nạn nhân khác) vẫn giữ nguyên.
- **ENGINE_DECISION:** Gắn cờ `isConsumableBlackCardDamage: true` trên `DAMAGE` step cho 5 lá Đen dùng 1 lần; xử lý nhánh Urban Legend trước khi trừ HP và đẩy `HEAL` step (`sourceKind: 'black-card'`).
- **TEST_REQUIREMENT:** Đủ 4 lá chính (`Vampire Bat`, `Spider`, `Dynamite`, `Spiritual Doll`) + `Banana Peel`, không áp dụng lên vũ khí Đen, chạm trần full HP, đa mục tiêu (`Dynamite`), `Vampire Bat` vẫn hồi cho người tung, bí mật P0 & `reactionPolicy`.

### 4. `exp2_arlene` — Arlene (Neutral, 8 HP · Expansion 2)
- **SOURCE_RULE:** *"Điệu Bộ: Bạn có thể phản ứng lại thẻ bài xanh lá như là một Shadow. Bạn không phải lộ diện bản thân để làm điều này."* | Thắng: *"Bạn bị hạ gục bởi một nhân vật Hunter."* (`exp2-neutral`)
- **SOURCE_AMBIGUITY:** `RC-19` — Chưa rõ cơ chế chọn trả lời theo kiểu Shadow mà không gây timing side-channel, liệu có đổi `faction` thật không, và thắng khi bị Hunter giết là tức thì hay cuối trận, có tính kỹ năng/thẻ của Hunter không.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phe thật (`player.faction`) của Arlene **luôn giữ nguyên `'wanderer'`** (không bao giờ đổi sang `'mist-order'`, không bị `Ernest` ép lộ diện hay phá đồ).
  - Không bắt buộc lộ diện để sử dụng kỹ năng.
  - Để **tránh lộ vai qua timing side-channel** khi bị điều tra bằng thẻ Xanh lá, Arlene sử dụng **chính sách phản ứng riêng tư khai báo sẵn trên server (`reactionPolicy`)**: mặc định (`'ASK'` hoặc `'AUTO_ACTIVATE_WHEN_ELIGIBLE'`) phản ứng tức thì (< 1ms) như một **Shadow** với các thẻ Xanh kiểm tra phe (vẫn tuân thủ đúng hiệu ứng nhận sát thương/hồi máu/giao đồ của lá bài đó); khi chủ nhân chủ động đặt `'AUTO_DECLINE'` qua kênh riêng tư, Arlene trả lời đúng phe thật `'wanderer'`. Thẻ theo HP (`inv_bully`, `inv_tough_lesson`) và `inv_prediction` vẫn đọc thông số thật.
  - **Điều kiện thắng (Immediate Individual Victory):** Arlene thắng cá nhân tức thì khi bị loại bởi hành động có quy kết nguồn sát thương thuộc về một **Hunter** (`attacker.faction === 'lantern-guard'`, bao gồm đòn đánh trực tiếp, kỹ năng, thẻ bài hoặc quyền năng địa điểm do Hunter kích hoạt). Sát thương môi trường/không có Hunter kết liễu (`attacker === null`, tự sát, Shadow hoặc Neutral giết) **không** thỏa mãn. Chỉ đánh giá sau khi sự kiện loại và `ELIMINATION_TRIGGERS` hoàn tất; bảo toàn ưu tiên đồng thắng deterministic.
- **ENGINE_DECISION:** Tích hợp trực tiếp vào `applyExpandedInvestigateCard` (zero prompt pause, zero clue leak); ghi nhận `arleneHunterKillTriggeredIds` trong `executeDamageStep` khi Arlene bị Hunter loại và đánh giá trong `evaluateExpandedVictory`.
- **TEST_REQUIREMENT:** Hunter đánh thường giết Arlene, Hunter dùng thẻ Đen/kỹ năng giết Arlene, sát thương không quy kết/Shadow giết (không thắng), phản ứng thẻ Xanh không lộ vai & không rò rỉ cho Spectator, giữ nguyên phe Neutral thật.

---

## Phần II — 8 Nhân vật Tier-3 (Phase 5C)

### 5. `exp1_ernest` — Ernest (Hunter, 10 HP · Expansion 1)
- **SOURCE_RULE:** *"Từ đạo: Bạn có thể hy sinh 2 máu để tất cả các Shadow lộ diện và hủy tất cả trang bị của họ. (Chỉ sử dụng 1 lần)."* | Thắng: Hunter chuẩn (`exp1-hunter`)
- **SOURCE_AMBIGUITY:** `RC-07` — Chưa rõ thời điểm dùng trong lượt, điều kiện HP tối thiểu (`<= 2 HP`), nơi chứa trang bị bị hủy (`discards` vs xóa vĩnh viễn), và thứ tự kích hoạt `Umibozu` khi bị ép lộ diện.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`); kỹ năng chủ động trong lượt (`ROLL_MOVE`, `LOCATION_ACTION`, `MAIN_ACTION` khi `hand.length === 0`), 1 lần/trận.
  - Yêu cầu còn ít nhất **`3` HP (`getRemainingHp(ernest) >= 3`)** để không tự sát bằng HP cost.
  - Trả **`2` HP không thể chặn (`applyHpCost`)**, tiêu hao `skillUsedOnce = true`.
  - Ép lộ diện toàn bộ **Shadow còn sống** (`p.alive && p.faction === 'mist-order'`) theo thứ tự ghế deterministic, và hủy toàn bộ trang bị đang đeo của họ vào `state.discards` qua pipeline trang bị tập trung.
  - Phát `ROLE_REVEALED_TRIGGERS` cho từng Shadow vừa chuyển từ ẩn sang lộ (nên `Umibozu` kích hoạt AoE 3 sát thương theo thứ tự deterministic!). Không tác động lên Hunter hay Neutral.
- **ENGINE_DECISION:** Triển khai trong `applyExpandedUseSkill` + `ROLE_REVEALED_TRIGGERS`.
- **TEST_REQUIREMENT:** Nhiều Shadow (ẩn + đã lộ + nhiều đồ), 0 Shadow hợp lệ/không đồ, ép lộ `Umibozu`, không ảnh hưởng Hunter/Neutral (`Bianca` còn nguyên đồ), bị chặn khi `HP <= 2`, SQLite persistence & privacy.

### 6. `exp1_gwendolen` — Gwendolen (Hunter, 14 HP · Expansion 1)
- **SOURCE_RULE:** *"Sự che chở: Bạn có thể tấn công lại cho những Hunter hoặc Neutral đã bị tấn công trong khu vực đó."* | Thắng: Hunter chuẩn (`exp1-hunter`)
- **SOURCE_AMBIGUITY:** `RC-10` & `RC-16` — Chưa rõ `"khu vực đó"` (`Location` hay `Cluster`), nạn nhân có cần đã lộ diện không (rủi ro rò rỉ phe nạn nhân ẩn nếu mở cửa sổ phản ứng!), tầm đánh lên kẻ tấn công và chống vòng lặp phản công.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`).
  - Kích hoạt sau một **đòn tấn công gốc (`!isRetaliatoryAttack`)** nhắm vào một người chơi khác trong **cùng Cụm chiến đấu** với Gwendolen thuộc phe **Hunter hoặc Neutral đã lộ diện (`victim.revealed === true`)**.
  - **Ghi chú công khai về bảo mật (Experimental Privacy Rule):** Yêu cầu nạn nhân phải **đã lộ diện** là quy tắc bảo mật thử nghiệm của HUSTVerse (không phải luật nguồn xác minh) nhằm ngăn tuyệt đối việc cửa sổ phản ứng vô tình làm lộ phe của một người chơi đang úp vai!
  - Yêu cầu kẻ tấn công còn sống và nằm trong tầm tấn công hợp lệ của Gwendolen (`canExpandedPlayerAttackTarget`: tôn trọng Cụm / `Handgun` / `Udi` / `Visions`).
  - Mở lựa chọn phản ứng ngoài lượt tùy chọn (`gwendolen_counter_attack`, tối đa 1 lần phản công cho mỗi đòn tấn công gốc đủ điều kiện; `defaultOptionId: 'skip'`).
  - Đòn phản công dùng RNG & pipeline sát thương tấn công chuẩn (`isRetaliatoryAttack: true`), **không** kích hoạt đệ quy lại Gwendolen.
- **ENGINE_DECISION:** Đẩy `GWENDOLEN_COUNTER` sau `POST_ATTACK_EFFECTS` với cờ chống đệ quy `isRetaliatoryAttack: true`.
- **TEST_REQUIREMENT:** Tầm đánh thường vs `Handgun`, đòn đa mục tiêu (`Machine Gun`), kẻ tấn công chết trước khi Gwendolen kịp phản công, nạn nhân ẩn không mở phản ứng, bảo vệ Neutral đã lộ diện, reconnect & chống vòng lặp.

### 7. `exp2_freyja` — Freyja (Hunter, 12 HP · Expansion 2)
- **SOURCE_RULE:** *"Tấn Công Liều Lĩnh: Sau khi tấn công, bạn có thể bỏ thẻ bài trang bị [để] tấn công thêm 1 lần nữa, số lần tấn công tương ứng với số trang bị mà bạn bỏ."* | Thắng: Hunter chuẩn (`exp2-hunter`)
- **SOURCE_AMBIGUITY:** `RC-18` — Bài nguồn gõ nhầm `"bị tấn công"`, chưa rõ bỏ `Masamune`, chọn mục tiêu mới từng đòn và xử lý bỏ đồ tuần tự.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`).
  - Sau khi hoàn tất đòn tấn công thường (`!isBonusAttack && !isRetaliatoryAttack`), nếu Freyja còn sống, còn ít nhất 1 trang bị hợp lệ (khác `ev-01` `Masamune`) và còn mục tiêu hợp lệ trong tầm, mở `PendingChoice` (`freyja_extra_attack`) để chọn bỏ 1 trang bị hợp lệ và chọn mục tiêu cho 1 đòn đánh thưởng tuần tự (hoặc chọn `done`).
  - Mỗi trang bị bỏ mang lại đúng 1 đòn đánh thưởng (`isBonusAttack: true`); trang bị bị bỏ ngay lập tức vào `state.discards` trước khi tung xúc xắc (không thể tái sử dụng sau reconnect/replay).
  - Các đòn đánh thưởng tự chúng không mở vòng kích hoạt Freyja mới; chuỗi tiếp tục chỉ cho đến khi Freyja chọn `done`, hết trang bị hợp lệ, hết mục tiêu, bị loại, hoặc trận kết thúc.
- **ENGINE_DECISION:** Bước `FREYJA_EXTRA_ATTACK_CHECK` nối vào cuối `POST_ATTACK_EFFECTS` của đòn đánh gốc; mỗi đòn thưởng dùng pipeline tấn công đầy đủ (hỗ trợ `Machine Gun`, `Udi`, `Bianca`, `Werewolf`, `Cindy`, `Wendigo`).
- **TEST_REQUIREMENT:** Quyền sở hữu đồ & chặn bỏ `Masamune`, `Machine Gun`, đổi mục tiêu giữa các đòn thưởng, tương tác `Udi` (bị loại khỏi mục tiêu hợp lệ), dừng khi Freyja chết hoặc thắng, không dùng lại đồ sau reconnect.

### 8. `exp2_warlord` — Warlord (Shadow, 14 HP · Expansion 2)
- **SOURCE_RULE:** *"Chiến Tranh: Trong giai đoạn di chuyển, bạn có thể chọn một người chơi để kéo người đó tới cùng khu vực với bạn và ngay lập tức tấn công người đó như một hành động thêm trong lượt, sau đó bạn chơi như bình thường. (Chỉ sử dụng 1 lần)."* | Thắng: Shadow chuẩn (`exp2-shadow`)
- **SOURCE_AMBIGUITY:** `RC-10` & `RC-17` — Chưa rõ trước hay sau khi đổ xúc xắc, kéo vào cùng `Location` hay `Cluster`, nạn nhân có kích hoạt hiệu ứng ô không, và quyền đi tiếp bình thường sau đó.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`), 1 lần/trận (`!skillUsedOnce`), kích hoạt ở pha `ROLL_MOVE` **trước** khi tung xúc xắc di chuyển (`consecutiveSameZoneRolls === 0`).
  - Chọn 1 người chơi khác còn sống, kéo họ tới **đúng vị trí `location` hiện tại của Warlord** (không kích hoạt hiệu ứng địa điểm cho người bị kéo).
  - Khóa `skillUsedOnce = true` ngay lập tức (chống nhân bản).
  - Thực thi ngay 1 đòn tấn công thưởng (`isBonusAttack: true`, không tiêu hao `attacksThisTurn`) qua pipeline tấn công chuẩn lên mục tiêu vừa kéo (nếu mục tiêu là `Witch` bị kéo rời khỏi `corridor`, Witch mất miễn nhiễm; nếu Warlord đang ở `corridor` thì Witch được miễn nhiễm; nếu mục tiêu bị `Udi` che chở tại vị trí mới thì đòn đánh bị chặn an toàn).
  - Sau khi giải quyết xong đòn thưởng & phản ứng, **Warlord tiếp tục lượt bình thường ở pha `ROLL_MOVE`**!
- **ENGINE_DECISION:** Hỗ trợ `USE_SKILL` (nhận `targetPlayerId` trực tiếp hoặc mở `PendingChoice` `warlord_pull_attack` nếu chưa truyền); đẩy đòn thưởng với `autoEndTurnMode: 'never'` giữ nguyên `turnPhase = 'ROLL_MOVE'`.
- **TEST_REQUIREMENT:** Thứ tự kéo → tấn công thưởng → tiếp tục `ROLL_MOVE`, không kích hoạt ô đích cho nạn nhân, `Witch` ở/rời `corridor`, chống nhân bản 1 lần/trận, DO hibernation giữa đòn thưởng.

### 9. `exp2_usurper` — Usurper (Shadow, 11 HP · Expansion 2)
- **SOURCE_RULE:** *"Khi bạn lộ diện nhân vật mình, thì những nhân vật khác không thể dùng 'Kỹ năng' hoặc 'Lá bài Trắng' để hồi máu. Bạn cũng có thể chọn lộ diện bản thân ở một lượt bất kỳ để chặn một lần hồi máu."* | Thắng: Shadow chuẩn (`exp2-shadow`)
- **SOURCE_AMBIGUITY:** `RC-11` — Bài nguồn dán nhầm tên kỹ năng của Unchained; chưa rõ phạm vi loại hồi máu bị chặn (`location` / `Black card` / tự hồi máu) và phản ứng ngoài lượt khi ẩn vai.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Khi đã lộ diện: kích hoạt hào quang cấm hồi máu liên tục lên **người chơi khác** đối với nguồn **`'skill'`** và **`'white-card'`**.
  - **Không** chặn nguồn `'black-card'` (`Vampire Bat`, `Diabolic Ritual`, `Urban Legend`), `'location'` (`corridor`), `'investigation'` (thẻ Xanh), và **không** chặn chính Usurper tự hồi máu.
  - Khi đang ẩn vai: nếu có 1 sự kiện hồi máu hợp lệ (`'skill' | 'white-card'`, `target !== usurper`, lượng hồi tiềm năng `> 0`) chuẩn bị commit qua `HealPipeline`, tôn trọng `reactionPolicy` (`ASK` mở secret `PendingChoice` `usurper_reveal_block_heal`; `AUTO_DECLINE` bỏ qua < 1ms; `AUTO_ACTIVATE_WHEN_ELIGIBLE` tự lật & chặn ngay).
  - Khi chọn lộ diện & chặn: lật vai Usurper, hủy hoàn toàn lần hồi máu đó **trước khi HP thay đổi**, và bật hào quang liên tục cho các lần hồi máu sau; không mở lại phản ứng sau khi hồi máu đã xử lý.
- **ENGINE_DECISION:** Tích hợp trực tiếp vào `CAP-04` `HealPipeline` (`executeHealStep`).
- **TEST_REQUIREMENT:** Thứ tự `HealPipeline`, chặn `Elise`, không chặn `Urban Legend` / `corridor` / tự hồi, chặn thẻ Trắng của `Gloria` (`Holy Water`/`Blessing`), lật ngoài lượt khi ẩn, `reactionPolicy` & bảo mật P0.

### 10. `exp1_angel` — Angel (Neutral, 8 HP · Expansion 1)
- **SOURCE_RULE:** *"Thiên sứ bảo hộ: Sau khi bắt đầu lượt tiếp theo của bạn, tất cả Neutral đã lộ diện không nhận bất kỳ sát thương nào. (Chỉ sử dụng 1 lần)."* | Thắng: *"Tất cả Neutral còn sống hoặc bạn đứng khu vực 'Church' (Số 6) khi trò chơi kết thúc."* (`exp1-neutral`)
- **SOURCE_AMBIGUITY:** `RC-10` & `RC-17` — Chưa rõ thời hạn kéo dài của hiệu ứng bảo vệ trễ và ánh xạ chính xác `Church (Số 6)`.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`); kỹ năng chủ động 1 lần/trận trong lượt Angel (`USE_SKILL` khi `hand.length === 0`) nạp trạng thái **`armed`** (`armedOnTurnNumber: state.turnNumber`).
  - Vào **đầu lượt kế tiếp của Angel** (`ON_TURN_START`), hào quang chuyển sang **`active`** và kéo dài cho tới **đầu lượt kế tiếp nữa của Angel** (khi đó tự hết hạn `expired`; nếu Angel bị loại thì hào quang cũng hết hạn).
  - Trong thời gian `active`, mọi **Neutral còn sống đã lộ diện** miễn nhiễm hoàn toàn **sát thương HP có thể chặn** (kể cả `Wrath` AoE, `Umibozu` AoE, đòn đánh, thẻ bài, địa điểm). Nếu 1 Neutral trước đó ẩn vai tự lật trong lúc hào quang đang `active`, họ lập tức được bảo vệ. Chi phí HP không thể chặn (`isHpCost` / `unpreventable`) vẫn áp dụng.
  - **Điều kiện thắng (End-of-Match Only):** Đánh giá khi trận đấu kết thúc hợp lệ; Angel phải **còn sống** VÀ (**toàn bộ Neutral đều còn sống** HOẶC **Angel đang đứng tại chính xác ô `lobby` (`Church`)** — không tính ô cặp cùng cụm).
- **ENGINE_DECISION:** Lưu `expansionState.angelAuras[angelId]` thuần JSON (sống sót qua DO hibernation); kiểm tra trong `executeDamageStep` & `triggerExpandedTurnStart` & `evaluateExpandedVictory`.
- **TEST_REQUIREMENT:** Chu kỳ `armed → active → expired`, chặn `Wrath` AoE, Neutral mới lật giữa hào quang được bảo vệ, `hp-cost` không bị chặn, thắng nhờ tất cả Neutral sống vs đứng chính xác `lobby` (ô cặp cùng cụm không thắng), DO hibernation.

### 11. `exp2_bianca` — Bianca (Neutral, 10 HP · Expansion 2)
- **SOURCE_RULE:** *"Mọi Thứ Phế Liệu: Bạn có thể bỏ một trang bị để vô hiệu sát thương từ một nguồn sát thương đơn mục tiêu."* | Thắng: *"Bạn có lượng máu còn lại thấp nhất trong tất cả các nhân vật còn sống khi trò chơi kết thúc."* (`exp2-neutral`)
- **SOURCE_AMBIGUITY:** `RC-16` — Chưa rõ yêu cầu lộ diện, bỏ `Masamune`, định nghĩa chính xác nguồn đơn mục tiêu vs AoE có 1 nạn nhân, và xử lý hòa lượng HP thấp nhất cuối trận.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - Phải đã lộ diện (`revealed === true`).
  - Mở cửa sổ phản ứng riêng tư trước khi commit HP (`bianca_discard_prevent`, `defaultOptionId: 'decline'`) khi nhận `dmg > 0` từ một **nguồn đơn mục tiêu (`isSingleTarget === true`)**, không phải `isHpCost`/`unpreventable`, và Bianca sở hữu ít nhất 1 trang bị hợp lệ (khác `ev-01` `Masamune`).
  - Các nguồn AoE/đa mục tiêu (`Machine Gun`, `Flare`, `Dynamite`, `Wrath`, `Umibozu`, `Vengeance`) bị **loại trừ hoàn toàn (`isSingleTarget: false`) kể cả khi Bianca là nạn nhân duy nhất trúng đòn**.
  - Khi xác nhận: bỏ đúng **1** trang bị hợp lệ vào `state.discards` (1 lần duy nhất, idempotent) và vô hiệu hóa toàn bộ lượng sát thương sự kiện đó về `0`.
  - **Điều kiện thắng (End-of-Match Only):** Bianca phải **còn sống** khi trận kết thúc và có `getRemainingHp(bianca) === minAliveHp` (cho phép **hòa** — nhiều người sống cùng có lượng HP thấp nhất vẫn giúp Bianca thắng!).
- **ENGINE_DECISION:** Đánh dấu `isSingleTarget` rõ ràng trên mọi `DAMAGE` step; chèn phản ứng Bianca trong `executeDamageStep` ngay trước bước commit HP; đánh giá thắng trong `evaluateExpandedVictory`.
- **TEST_REQUIREMENT:** Chặn đòn đơn mục tiêu (attack/card/skill), loại trừ AoE dù chỉ 1 nạn nhân (`Machine Gun`, `Dynamite`, `Wrath`), cấm bỏ `Masamune`, không chặn `hp-cost`, thắng đơn và thắng hòa min-HP, reconnect không mất/lặp đồ.

### 12. `exp2_dalton` — Dalton (Neutral, 13 HP · Expansion 2)
- **SOURCE_RULE:** *"Vòng Đấu Thứ 12: Lộ diện nhân vật của bạn khi chạm mức 12 máu. Từ thời điểm đó, bạn không thể tự hồi máu cho bản thân mình."* | Thắng: *"Hạ gục một nhân vật sau khi kích hoạt kỹ năng 'Vòng đấu thứ 12'. Mặt khác, phải là người còn nhiều máu nhất khi trò chơi kết thúc."* (`exp2-neutral`)
- **SOURCE_AMBIGUITY:** `RC-15` *(Unresolved original source ambiguity preserved explicitly)* — Nguyên văn *"chạm mức 12 máu"* chưa có bản nguồn xác minh chính thức là **12 HP còn lại (`hp <= 12`, mất 1 HP)** hay **12 vết thương (`wounds >= 12`, còn 1 HP)**.
- **HUSTVERSE_HOUSE_RULE (`house-rule-approved`):**
  - **Quy ước thử nghiệm:** Diễn giải theo **Remaining HP `<= 12`** (`getRemainingHp(dalton) <= 12`, đồng nhất quy ước Remaining HP của Phase 4 `Fallen`/`Fujiko`). *(Ghi nhận công khai rằng sự mơ hồ 12 remaining HP vs 12 wounds ở tài liệu gốc vẫn là unresolved source ambiguity.)*
  - Kích hoạt **lộ diện bắt buộc** ngay ở lần mất HP thực sự đầu tiên (`actual >= 1`) đưa Dalton xuống `<= 12 HP` (không kích hoạt nếu sát thương bị chặn về `0`).
  - Ghi nhận `daltonActivatedByPlayer[daltonId] = { activatedAtTurn, damageEventId }`.
  - Sau khi kích hoạt, **`HealPipeline` chặn mọi hồi máu do chính Dalton khởi phát lên bản thân Dalton** (`actorPlayerId === daltonId && targetPlayerId === daltonId`). Hồi máu từ người chơi khác (vd. `Elise`, `Blessing`, người khác dùng Ô 9) vẫn hợp lệ trừ khi bị `Usurper` chặn.
  - **Điều kiện thắng (Immediate Individual OR End-of-Match Highest HP):**
    1. **Tức thì:** Dalton còn sống và tự tay hạ gục một người chơi khác (`killerPlayerId === daltonId`) **sau khi** đã kích hoạt `Vòng Đấu Thứ 12`.
    2. **Cuối trận:** Dalton còn sống và có `getRemainingHp(dalton) === maxAliveHp` (cho phép **hòa** nhiều người cùng HP cao nhất).
    3. Bảo toàn thứ tự ưu tiên đồng thắng deterministic khi cạnh tranh với `Cindy`/`Bipolar`/phe thắng.
- **ENGINE_DECISION:** Kiểm tra kích hoạt trong `executeDamageStep` sau khi commit `actual >= 1`; kiểm tra cấm tự hồi máu trong `HealPipeline`; ghi nhận `daltonKillWinTriggeredIds` khi Dalton hạ gục mục tiêu sau kích hoạt.
- **TEST_REQUIREMENT:** HP `13→12` và `13→11`, sát thương bị chặn về `0` không kích hoạt, lộ diện bắt buộc, chặn tự hồi máu (`Holy Water`/`Corridor`), vẫn nhận hồi máu ngoài (`Elise`/`Blessing`), thắng hạ gục sau kích hoạt (không tính hạ gục trước kích hoạt), thắng hòa max-HP, cạnh tranh `Cindy`/`Bipolar`.
