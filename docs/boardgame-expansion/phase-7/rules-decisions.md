# Bóng Đêm KTX — Phase 7 Rules Ratification & Experimental House Rules (Tier-4)

> **Cảnh báo Nguồn gốc Luật (Rules Provenance):**  
> Toàn bộ 8 nhân vật Tier-4 dưới đây có các điểm mơ hồ hoặc mâu thuẫn trong tài liệu tiếng Việt nguồn (`https://thegioiboardgame.vn/`). Mọi quyết định luật trong tài liệu này được gắn trạng thái **`house-rule-approved`** dành riêng cho **bộ luật thử nghiệm nội bộ HUSTVerse (`starter-fifty-six` / experimental)**, tuyệt đối **không** gắn nhãn `verified` như luật chính thức nguyên bản khi chưa có xác minh nguồn độc lập.

---

## 1. `exp1_lloyd` — Lloyd (Hunter / `lantern-guard` · **12 HP** · `expansion-1`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Lạc lối:* *"Bạn có thể ngăn chặn cuộc tấn công xảy ra bất cứ lúc nào bằng cách cho bản thân mất 2 máu."*
  - *Điều kiện thắng:* *"Tiêu diệt tất cả các Shadow."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-1-sha` (`RC-06`)
- **`SOURCE_AMBIGUITY`:**
  - Không nêu rõ ngắt trước hay sau khi đổ xúc xắc; phạm vi toàn bàn hay trong cụm; xử lý Súng Máy (Machine Gun); có được tự hy sinh khi HP ≤ 2 hay không; xử lý timing side-channel nếu chưa lộ diện.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Lloyd phải **còn sống** (không ngủ đông) và **đã lộ diện** mới mở cửa sổ ngắt tấn công.
  - Phản ứng được với mọi đòn tấn công thường hợp lệ trên **toàn bản đồ**, kích hoạt **trước khi đổ xúc xắc** tấn công (`GlobalAttackInterrupt`).
  - Tùy chọn, lặp lại được nhiều lần; trả chi phí **2 sát thương không thể chặn** (`isHpCost: true, unpreventable: true`) để hủy toàn bộ đòn tấn công vừa tuyên bố.
  - Hủy đòn Súng Máy (`ev-06`) nhiều mục tiêu như **một hành động duy nhất**.
  - Được phép hy sinh lượng HP cuối cùng (1–2 HP); cam kết hủy đòn tấn công trước rồi mới xử lý loại Lloyd do chi phí HP.
  - Không thể hủy sát thương bài/địa điểm không phải đòn tấn công tuyên bố, không hủy ngược đòn đã giải quyết. Quá hạn timeout = từ chối (`decline`).
  - Nhiều ứng viên có kỹ năng Lloyd (gồm bản sao từ DynamicSkillCopy) xếp hàng theo thứ tự khoảng cách ghế từ chủ lượt; ngay khi 1 người hủy đòn, mọi cửa sổ còn lại đóng ngay lập tức.
- **`ENGINE_DECISION`:**
  - Dùng `PendingDeclaredAttack` trong [`global-attack-interrupt.ts`](../../../features/boardgame/domain/global-attack-interrupt.ts); khi bị hủy, `state.rngState` không bị tiêu hao bất kỳ lần gọi xúc xắc nào.
- **`OPEN_QUESTION`:**
  - Cần đánh giá tỷ lệ hủy đòn lặp của Lloyd trong Human Beta Playtest (có quá kéo dài trận đấu không).
- **`TEST_REQUIREMENT`:**
  - Đòn thường, Machine Gun, ngắt xuyên bản đồ, reconnect khi mở cửa sổ ngắt, mức 1/2/3 HP, hy sinh tự loại sau hủy đòn, bản sao Lloyd, 0 RNG tiêu hao khi hủy, nhiều ứng viên Lloyd đồng thời.

---

## 2. `exp1_vengeful_spirit` — Vengeful Spirit (Shadow / `mist-order` · **13 HP** · `expansion-1`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Quyền năng bất diệt:* *"Bạn có thể lộ diện ngay sau khi có 1 người chết. Sau đó, bạn có được kỹ năng của người đã chết cho đến hết trò chơi. (Chỉ sử dụng 1 lần)"*
  - *Điều kiện thắng (nguyên văn bài nguồn):* *"Tiêu diệt tất cả các Hunter hoặc Neutral."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh` (`RC-04`)
- **`SOURCE_AMBIGUITY`:**
  - Bài nguồn mâu thuẫn nội bộ giữa *"chọn thời điểm hợp lý"* (Ưu điểm) và *"phụ thuộc vào người đầu tiên bị hạ gục"* (Nhược điểm).
  - Nguyên văn điều kiện thắng ghi *"Tất cả các Hunter hoặc Neutral"* (thiếu số `3` so với 8 Shadow khác cùng bài).
  - Chưa rõ xử lý kỹ năng once-per-match đã dùng, sao chép lồng nhau, chết đồng thời nhiều người, và Undead ngủ đông.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Kích hoạt **tùy chọn** (1 lần/trận) trên bất kỳ sự kiện **loại vĩnh viễn hợp lệ** (`FINAL_ELIMINATED`) nào khi Vengeful Spirit còn sống và chưa dùng quyền sao chép (có thể bỏ qua cái chết đầu để chờ mục tiêu sau).
  - Tự lộ diện khi kích hoạt nếu đang ẩn (khi còn ẩn, PendingChoice là **bí mật** với tiền tố `choice-secret-*`).
  - Nếu nhiều người bị loại trong cùng lô sự kiện, chọn đúng 1 nạn nhân hợp lệ qua lựa chọn riêng tư trên server.
  - Sao chép **kỹ năng hiệu lực** (`effectiveSkillRoleId`) với trạng thái sử dụng MỚI (`skillUsedOnce = false`). **Không** sao chép phe, **không** sao chép điều kiện thắng, **không** kế thừa thông tin riêng tư, **không** hồi tố sự kiện quá khứ.
  - Không kích hoạt khi Undead mới vào trạng thái ngủ đông (`DORMANT_PENDING_REVIVE`).
  - **Sai lệch điều kiện thắng được ghi nhận tường minh:** Trong bộ luật thử nghiệm HUSTVerse, Vengeful Spirit dùng chuẩn chiến thắng phe Shadow nhất quán: **Toàn bộ Hunter bị loại HOẶC 3 Neutral bị loại** (ghi nhận sai lệch so với câu chữ gốc để đối chiếu luật chính thức về sau).
- **`ENGINE_DECISION`:**
  - Gắn kết qua `bindCopiedSkillFromElimination` trong [`dynamic-skill-copy.ts`](../../../features/boardgame/domain/dynamic-skill-copy.ts) với `MAX_SKILL_COPY_DEPTH = 3` và chặn chu trình.
- **`OPEN_QUESTION`:**
  - Xác minh bản thẻ tiếng Anh/Nhật gốc của Vengeful Spirit về ngưỡng Neutral thắng (3 Neutral vs toàn bộ Neutral).
- **`TEST_REQUIREMENT`:**
  - Bỏ qua cái chết đầu và chọn cái chết sau; chết đồng thời nhiều người; sao chép kỹ năng once-per-match; sao chép G43, Voodoo, Lloyd, Undead; sao chép lồng nhau; nguồn biến mất; không phát lại sát thương/sự kiện; giữ nguyên điều kiện thắng Shadow.

---

## 3. `exp1_voodoo` — Voodoo (Shadow / `mist-order` · **13 HP** · `expansion-1`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Con rối:* *"Bắt đầu lượt của bạn, chọn 1 người chơi: Bạn cướp lượt chơi của người đó, nhưng bạn không thể xem và sử dụng chức năng nhân vật đó. (Chỉ sử dụng 1 lần)"*
  - *Điều kiện thắng:* *"Tiêu diệt tất cả các Hunter hoặc 3 Neutral."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh` (`RC-01`)
- **`SOURCE_AMBIGUITY`:**
  - Không rõ cướp ngay lập tức hay trì hoãn tới lượt kế của nạn nhân; phạm vi hành động được phép điều khiển; quyền xem thẻ Điều tra Xanh lá; xử lý khi mục tiêu chết trước lượt hoặc Voodoo rớt mạng giữa lượt.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Áp dụng mô hình **Deferred Hijack (Trì hoãn tới lượt kế của mục tiêu)**:
    - Phải lộ diện để kích hoạt; dùng 1 lần/trận vào đầu lượt Voodoo, chọn 1 người chơi khác đang sống.
    - Lượt dùng bị tiêu hao ngay khi cam kết mục tiêu hợp lệ; Voodoo vẫn đi hết lượt hiện tại của mình.
    - Khi tới lượt tiếp theo của mục tiêu, Voodoo trở thành `controllerPlayerId` tạm thời điều khiển các hành động công khai (tung xúc xắc, chọn đích, rút/dùng địa điểm, trang bị/dùng bài Trắng-Đen công khai rút trong lượt, tấn công, kết thúc lượt), trong khi nạn nhân vẫn là `activePlayerId` & `privateInformationOwnerId`.
    - Voodoo **bị cấm tuyệt đối**: đọc vai ẩn/bài trên tay/manh mối riêng/reconnectToken, dùng `REVEAL_ROLE`, `USE_SKILL`, `TRANSFER_TO_BETHANY`, `INVESTIGATE_CARD` hay giải quyết `RESOLVE_CHOICE` của nạn nhân.
    - Nếu rút thẻ Điều tra (`inv-*`) hoặc phát sinh quyết định bí mật, tạm dừng quyền điều khiển công khai để chính nạn nhân xử lý.
    - Nạn nhân bị chặn gửi lệnh công khai tranh chấp trong lúc grant đang hoạt động.
    - Grant tự hết hạn vĩnh viễn khi hết lượt; nếu nạn nhân hoặc Voodoo chết trước lượt bị cướp, grant tự hủy (không chuyển sang người khác). Nếu Voodoo rớt mạng giữa lượt cướp, đồng hồ quá hạn an toàn tự hoàn tất lượt và hủy grant (không khóa bàn).
- **`ENGINE_DECISION`:**
  - Cô lập toàn bộ thẩm quyền qua [`turn-ownership.ts`](../../../features/boardgame/domain/turn-ownership.ts), cổng `resolveTurnCommandAuthority` trong `actions.ts`, và đồng hồ theo `getEffectiveTurnControllerId` trong `worker/src/boardgame-room.ts`.
- **`OPEN_QUESTION`:**
  - Đánh giá mức độ rõ ràng UX khi tạm dừng quyền điều khiển để nạn nhân tự xử lý lá Điều tra trong Human Beta.
- **`TEST_REQUIREMENT`:**
  - Điều khiển tạm thời hợp lệ; bảo toàn vòng lượt; khóa vai ẩn & thẻ Điều tra; cấm skill/reveal nạn nhân; reconnect của controller & victim; hết hạn grant; mục tiêu chết trước lượt; Voodoo chết trước lượt; hibernation giữa hijack; chống phát lại mã grant hết hạn; quyết định công khai/riêng tư xen kẽ.

---

## 4. `exp1_undead` — Undead (Shadow / `mist-order` · **11 HP** · `expansion-1`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Xác sống trỗi dậy:* *"Chỉ lộ diện khi bạn chết. Sau đó, vào đầu lượt tiếp theo mình, bạn sẽ hồi sinh với số máu là 6 và chơi tiếp lượt đó như bình thường. (Chỉ sử dụng 1 lần)"*
  - *Điều kiện thắng:* *"Tiêu diệt tất cả các Hunter hoặc 3 Neutral."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh` (`RC-02`)
- **`SOURCE_AMBIGUITY`:**
  - Chưa rõ khi là Shadow cuối cùng chết lần 1 thì Hunter có thắng ngay không; trạng thái trong thời gian chờ hồi sinh (đếm chết, loot đồ, mục tiêu bài/skill); nghĩa của *"số máu là 6"* (6 HP còn lại hay 6 vết thương); miễn nhiễm bị ép lộ diện (`Ernest`, gương).
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Không được tự lộ diện (`REVEAL_ROLE`) trước sự kiện chí tử lần đầu; mọi hiệu ứng ép lộ diện trước lần chí tử đầu tiên (`Ernest`, thẻ ép lộ) đều tôn trọng hạn chế này.
  - Sự kiện chí tử lần đầu đưa Undead sang trạng thái **`DORMANT_PENDING_REVIVE`** và lật vai công khai ngay lúc đó.
  - Trong thời gian ngủ đông: không thể hành động, không thể bị nhắm mục tiêu/nhận sát thương, **giữ nguyên trang bị**, **không tính là bị loại hoàn toàn** (không cho Hunter thắng sớm nếu là Shadow cuối, không thưởng loot, không kích hoạt Daniel/Charles/Gideon/Wendigo/Vengeful Spirit/Antimony/Bonnie/Cain).
  - Bảo toàn đúng vị trí lượt trong `turnOrder`: ở đầu lượt kế tiếp của chính Undead, máy chủ tự hồi sinh Undead với **6 HP còn lại** (`hp = 6`, `woundsTaken = 5`), chuyển sang **`REVIVED`**, tiêu hao 1 lượt hồi sinh duy nhất và chơi lượt bình thường.
  - Sự kiện chí tử lần thứ hai đưa sang **`FINAL_ELIMINATED`** (loại vĩnh viễn, chạy đủ quy trình loot/kỹ năng/thắng thua chuẩn).
  - Phân biệt hoàn toàn `exp1_undead` (hồi sinh 6 HP) với `exp1_undying` (Mạ Sắt giảm 1 sát thương — Phase 2B).
- **`ENGINE_DECISION`:**
  - Vòng đời 4 trạng thái trong [`pending-resurrection.ts`](../../../features/boardgame/domain/pending-resurrection.ts) gắn vào bước 4 của chuỗi giao dịch loại 10 bước và `advanceTurn`.
- **`OPEN_QUESTION`:**
  - Xác minh thêm luật thẻ gốc tiếng Anh xem "6 damage" có nghĩa là 6 HP còn lại hay 6 vết thương trên thang sát thương vật lý.
- **`TEST_REQUIREMENT`:**
  - Lần chí tử 1, trạng thái dormant, hồi sinh 6 HP đầu lượt kế, chết lần 2 vĩnh viễn, là Shadow cuối cùng, tương tác Gideon/Wendigo/Vengeful Spirit/Antimony/Ernest, chặn sát thương khi dormant, giữ trang bị, reconnect/hibernation, giữ thứ tự lượt, không thưởng chết kép.

---

## 5. `exp1_antimony` — Antimony (Neutral / `wanderer` · **8 HP** · `expansion-1`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Nhân bản:* *"Khi có 1 người chơi khác chết, bạn lộ diện thân phận của mình. Bạn sao chép hết kỹ năng và điều kiện thắng của người chơi đó. (Chỉ sử dụng 1 lần)."*
  - *Điều kiện thắng:* *"Sau khi kỹ năng kích hoạt thì mới có điều kiện thắng."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha` (`RC-04`)
- **`SOURCE_AMBIGUITY`:**
  - Không nêu rõ bắt buộc ở cái chết đầu hay tùy chọn; có đổi `effectiveFaction` theo người chết hay giữ Neutral; xử lý chết đồng thời; xử lý sao chép mục tiêu phụ thuộc/vòng lặp và kỹ năng đã tiêu hao.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - **Bắt buộc tự động kích hoạt** ngay ở sự kiện loại vĩnh viễn hợp lệ đầu tiên của người chơi khác (không kích hoạt với Undead ngủ đông). Nếu nhiều người chết đồng thời, chọn nạn nhân đầu tiên theo thứ tự `turnOrder`.
  - Lộ diện Antimony, sao chép **kỹ năng hiệu lực** của nạn nhân (trạng thái lượt dùng mới, qua `DynamicSkillCopy`) VÀ sao chép **điều kiện thắng** thông qua quan hệ `COPY_GOAL` trong `CopiedVictoryGraph`.
  - Giữ nguyên phe gốc **Neutral** (`baseFaction = 'wanderer'`), không tự động đổi phe theo nạn nhân (trừ khi kỹ năng sao chép như Bonnie tự đổi phe về sau).
  - Dùng 1 lần/trận, không hồi tố sự kiện cũ, không kế thừa thông tin bí mật của nạn nhân.
  - Trước khi kích hoạt, Antimony không có điều kiện thắng hợp lệ; mọi chu trình hoặc mục tiêu chưa gắn kết đều fail-closed (`won = false`).
- **`ENGINE_DECISION`:**
  - Kết hợp `bindCopiedSkillFromElimination` + `antimonyCopiedGoalByPlayer` đi qua `CopiedVictoryGraph` (không viết trùng logic đồ thị thắng).
- **`OPEN_QUESTION`:**
  - Theo dõi tỷ lệ thắng thực tế của Antimony (8 HP rất mỏng) khi sao chép Hunter/Shadow vs Neutral.
- **`TEST_REQUIREMENT`:**
  - Cái chết hợp lệ đầu tiên; chết đồng thời; sao chép Hunter/Shadow/Neutral; sao chép mục tiêu của Clairvoyant/Cassie; sao chép kỹ năng hiệu lực của Vengeful Spirit; sao chép hồi sinh Undead; cô lập once-per-match; chu trình CopiedVictoryGraph; giữ baseFaction; không lộ thông tin bí mật.

---

## 6. `exp2_cain` — Cain (Neutral / `wanderer` · **11 HP** · `expansion-2`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Nước Cờ Quyền Lực (1 lần/trận):* *"Bạn hồi số lượng máu bằng với tổng số người đang chơi. Và hai phe Hunter và Shadow được thêm 1 điều kiện thắng là 'Khi Cain chết'."*
  - *Điều kiện thắng:* *"Một Hunter, một Shadow và một Neutral khác ngoài bạn đã chết. Trong một ván chơi 5 người, giết một Hunter và một Shadow."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2` (`RC-05`)
- **`SOURCE_AMBIGUITY`:**
  - Số người đang chơi là số người ban đầu hay số người còn sống; phân biệt 5P ("giết") vs 6–8P ("đã chết"); khi Cain chết thì cả hai phe Hunter & Shadow cùng thắng hay chỉ phe người giết thắng.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Phải lộ diện để kích hoạt, 1 lần/trận.
  - Hồi máu bằng **số người chơi còn sống tại thời điểm kích hoạt** đi qua `HealPipeline` (chặn tràn quá 11 HP, tôn trọng hào quang `Usurper`).
  - Đăng ký bộ điều chỉnh thắng toàn cục: khi Cain bị loại vĩnh viễn (`FINAL_ELIMINATED`), **cả phe Hunter VÀ phe Shadow đều thỏa điều kiện thắng đồng thời** (`MultiFactionVictory`: `winnerFaction = 'multi-faction'`, `winningFactions = ['lantern-guard', 'mist-order']`). Không chọn tùy tiện chỉ phe kẻ tấn công.
  - Điều kiện thắng cá nhân (thắng tức thì):
    - **6P–8P:** Cain còn sống AND có ít nhất 1 Hunter, 1 Shadow và 1 Neutral **khác** đã bị loại vĩnh viễn.
    - **5P:** Cain còn sống AND chính Cain được ghi nhận kết liễu ít nhất 1 Hunter và 1 Shadow.
    - **4P:** Không có ghế Neutral -> không chia Cain.
- **`ENGINE_DECISION`:**
  - Lưu `cainDeathVictoryModifierIds` & `killedFactionsByPlayer` trong `ExpansionRuntimeState`; đánh giá tại `evaluateExpandedVictoryWithDiagnostics` trong [`victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts).
- **`OPEN_QUESTION`:**
  - Theo dõi tác động của chiến thắng song phe Hunter+Shadow lên trải nghiệm xã hội trong Human Beta.
- **`TEST_REQUIREMENT`:**
  - Hồi máu theo số người sống; Usurper chặn hồi máu; kích hoạt rồi chết -> đồng thắng cả 2 phe; chết trước khi kích hoạt -> không kích hoạt song phe; tự thắng 6P–8P; điều kiện tự giết 5P; chết do Neutral/bài/địa điểm; kích hoạt đồng thời với Neutral khác; DTO & UI đa phe thắng.

---

## 7. `exp2_bonnie` — Bonnie (Neutral / `wanderer` · **10 HP** · `expansion-2`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Nghi Thức Kế Thừa:* *"Khi giết chết một Shadow, bạn sẽ trở thành một Shadow và trở thành đồng đội của các Shadow khác."*
  - *Điều kiện thắng:* *"Chiến thắng khi trở thành một phần của phe Shadow sau khi giành được vị trí từ một trong số chúng."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2` (`RC-03`)
- **`SOURCE_AMBIGUITY`:**
  - Thứ tự khi Bonnie giết Shadow cuối cùng (Hunter thắng ngay hay Bonnie kịp thế chỗ thành Shadow sống); cập nhật phe động cho thẻ Điều tra / Ernest / Cindy / Angel / Bryon / N.C. Soldier; nguồn sát thương ngoài đòn đánh thường; lộ diện bắt buộc hay không.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Kích hoạt khi Bonnie nhận ghi nhận loại hợp lệ (đòn đánh trực tiếp hoặc sát thương bài/kỹ năng quy thuộc Bonnie) lên một nhân vật đang có `effectiveFaction === 'mist-order'`.
  - Chuyển đổi **`effectiveFaction`** từ `wanderer` sang `mist-order` và **lộ diện bắt buộc** **TRƯỚC** bước đánh giá thắng thua (bước 6–7 trước bước 9–10).
  - Nếu Bonnie hạ gục Shadow cuối cùng, Bonnie trở thành Shadow còn sống duy nhất trước khi kiểm tra thắng Hunter -> trận đấu tiếp tục!
  - Giữ nguyên `roleId = 'exp2_bonnie'` và `baseFaction = 'wanderer'` trong provenance; chuyển đổi 1 lần duy nhất, bất khả nghịch, không sửa lịch sử loại trước đó.
  - Mọi kiểm tra phe sau thời điểm chuyển đổi (Điều tra, Ernest, Cindy, Angel, Bryon, N.C. Soldier, đếm phe thắng) dùng `getEffectiveFaction`. Bonnie không bao giờ bị đếm trùng ở cả 2 phe; nếu Bonnie chết sau khi đã là Shadow, vẫn đồng thắng khi phe Shadow thắng.
- **`ENGINE_DECISION`:**
  - Triển khai qua [`dynamic-allegiance.ts`](../../../features/boardgame/domain/dynamic-allegiance.ts) (`convertPlayerEffectiveFaction`, `getEffectiveFaction`).
- **`OPEN_QUESTION`:**
  - Không có mâu thuẫn kiến trúc còn mở; theo dõi cân bằng tỷ lệ chuyển phe thành công ở 5P–8P.
- **`TEST_REQUIREMENT`:**
  - Giết Shadow thường; giết Shadow cuối cùng; thứ tự thắng Hunter; Điều tra sau chuyển phe; Ernest nhắm sau chuyển phe; kiểm tra Cindy/Angel/Bryon; Bonnie chết sau chuyển phe; reconnect/hibernation; chống chuyển đổi kép; lô loại nhiều người; tương tác copy & liên minh N.C. Soldier.

---

## 8. `exp2_nc_soldier` — N.C. Soldier (Neutral / `wanderer` · **13 HP** · `expansion-2`)

- **`SOURCE_RULE`:**
  - *Kỹ năng — Chiêu Mộ:* *"Như một đòn tấn công trực tiếp, bạn có thể sử dụng kỹ năng 'Chiêu Mộ' thay cho một đòn tấn công thông thường lên một nhân vật Neutral. Nếu nhân vật đó chịu ít nhất 5 sát thương, nhân vật Neutral đó sẽ thay đổi điều kiện chiến thắng và Kỹ năng Đặc biệt để giống với bạn, sau đó họ sẽ chiến đấu về phe bạn."*
  - *Điều kiện thắng:* *"Chiêu mộ tất cả các nhân vật Neutral khác trong lúc chơi và thu thập đủ các lá bài 'Machine gun', 'Handgun', và 'Chainsaws'."*
  - *Nguồn:* `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2` (`RC-09`)
- **`SOURCE_AMBIGUITY`:**
  - Nhắm mục tiêu chưa lộ diện có làm lộ phe không; ngưỡng ≥ 5 sát thương là cộng dồn hay 1 đòn; 3 vũ khí do thủ lĩnh cầm hay cả nhóm; xử lý bàn 5P chỉ có 1 Neutral; xử lý Neutral khác chết hoặc Bonnie đổi phe trước khi chiêu mộ.
- **`APPROVED_EXPERIMENTAL_HOUSE_RULE`** (`rulesStatus: "house-rule-approved"`):
  - Phải **đã lộ diện** để sử dụng Chiêu Mộ (tiêu hao lượt tấn công thường trong lượt đó).
  - Chỉ được nhắm tới một người chơi khác **đang sống, đã lộ diện công khai, có `effectiveFaction === 'wanderer'`, chưa thuộc liên minh** và nằm trong tầm tấn công (bảo vệ tuyệt đối bí mật vai ẩn!).
  - Chạy qua đường ống giao tranh chuẩn trên server (kể cả ngắt Lloyd / khiên / phòng thủ); sau khi đòn tấn công kết thúc, nếu mục tiêu **vẫn còn sống** VÀ có tổng **vết thương tích lũy `woundsTaken >= 5`**, chiêu mộ thành công!
  - Thành viên được chiêu mộ: giữ nguyên `roleId`, `baseFaction = 'wanderer'`, `effectiveFaction = 'wanderer'`; gia nhập `AllianceGroupRecord` độc lập; đổi kỹ năng hiệu lực sang Chiêu Mộ (`exp2_nc_soldier`) để hỗ trợ chiêu mộ tiếp; nhận mục tiêu thắng chung của liên minh (thay thế mục tiêu cũ). Không thể chiêu mộ lặp.
  - **Điều kiện thắng liên minh (tức thì):** (1) Thủ lĩnh còn sống (và còn là Neutral); (2) Ít nhất 1 Neutral khác được chiêu mộ; (3) **Mọi** Neutral khác được chia ban đầu trong trận đều đã được chiêu mộ và thuộc liên minh (nếu có Neutral chết hoặc Bonnie chuyển thành Shadow trước khi chiêu mộ -> không thể thỏa); (4) Thủ lĩnh **tự mình sở hữu** đủ 3 vũ khí: `ev-06` (Machine Gun), `ev-05` (Handgun), `ev-03` (Chainsaw). Thành viên đã chiêu mộ đồng thắng cùng thủ lĩnh.
  - **Loại trừ bàn 5P:** Do bàn 5P chỉ có 1 ghế Neutral duy nhất, `exp2_nc_soldier` bị loại khỏi pool chia vai Wanderer ở bàn 5P (áp dụng riêng cho ruleset mở rộng, không chạm Classic PRNG).
- **`ENGINE_DECISION`:**
  - Lưu `AllianceGroupRecord` + `originallyDealtNeutralIds` trong [`dynamic-allegiance.ts`](../../../features/boardgame/domain/dynamic-allegiance.ts) và gắn kỹ năng hiệu lực qua `bindNcSoldierRecruitedSkill` trong [`dynamic-skill-copy.ts`](../../../features/boardgame/domain/dynamic-skill-copy.ts).
- **`OPEN_QUESTION`:**
  - Theo dõi tỷ lệ hoàn thành đủ 3 vũ khí trên 1 thủ lĩnh trong mô phỏng 30.000 trận & Human Beta.
- **`TEST_REQUIREMENT`:**
  - Chiêu mộ Neutral đã lộ; từ chối Hunter/Shadow; không lộ vai ẩn; ngưỡng đúng 5 vết thương tích lũy; mục tiêu chết trước khi chiêu mộ; chiêu mộ nhiều người; đồng minh dùng Chiêu Mộ tiếp; giữ nguyên `roleId` gốc; kiểm tra 3 vũ khí chỉ tính trên thủ lĩnh; cướp vũ khí làm mất điều kiện thắng; 1 Neutral chết trước chiêu mộ; Bonnie đổi phe trước chiêu mộ; loại trừ bàn 5P; đồng thắng liên minh; reconnect/persistence.
