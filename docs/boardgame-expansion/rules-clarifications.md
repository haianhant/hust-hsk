# Bóng Đêm KTX — Rules Clarifications & Unresolved Specifications (Phase 0)

> **Nguyên tắc bắt buộc (Phase 0 Gate):**
> - Tài liệu này chỉ trích dẫn và đối chiếu trực tiếp từ 6 bài viết nguồn tại `https://thegioiboardgame.vn/`.
> - **Không tự chọn phương án chưa được duyệt làm luật chính thức.** Mọi mục chưa được xác minh 100% đều giữ trạng thái **`UNRESOLVED`** và tương ứng `rulesStatus: "needs-clarification"` trong [`character-catalog.json`](./character-catalog.json).
> - Trong tổng số **56 nhân vật mở rộng**: **4 nhân vật** có luật nguồn rõ ràng không mâu thuẫn (`verified`: `G43`, `Fiona`, `Wendigo`, `Wyvern`) và **52 nhân vật** có ít nhất một điểm mơ hồ / mâu thuẫn nguồn / yêu cầu ánh xạ địa điểm-thẻ KTX (`needs-clarification` / `UNRESOLVED`).

---

## Mục lục

1. [Tổng quan thống kê & Quy tắc đối chiếu](#1-tổng-quan-thống-kê--quy-tắc-đối-chiếu)
2. [Nhóm A — 10 Hạng mục Trọng điểm bắt buộc phân tích sâu](#2-nhóm-a--10-hạng-mục-trọng-điểm-bắt-buộc-phân-tích-sâu)
   - [RC-01: Voodoo (`exp1_voodoo`) — Điều khiển lượt & Quyền thực hiện action](#rc-01-voodoo-exp1_voodoo)
   - [RC-02: Undead (`exp1_undead`) — Hồi sinh, Loại khỏi trận & Thời điểm kiểm tra thắng](#rc-02-undead-exp1_undead)
   - [RC-03: Bonnie (`exp2_bonnie`) — Chuyển phe động & Điều kiện thắng](#rc-03-bonnie-exp2_bonnie)
   - [RC-04: Antimony (`exp1_antimony`) & Vengeful Spirit (`exp1_vengeful_spirit`) — Sao chép kỹ năng & Điều kiện thắng](#rc-04-antimony-exp1_antimony--vengeful-spirit-exp1_vengeful_spirit)
   - [RC-05: Cain (`exp2_cain`) — Điều kiện thắng liên kết nhiều phe & Hồi máu theo số người chơi](#rc-05-cain-exp2_cain)
   - [RC-06: Lloyd (`exp1_lloyd`) — Phản ứng chặn tấn công ngoài lượt](#rc-06-lloyd-exp1_lloyd)
   - [RC-07: Ernest (`exp1_ernest`) — Tiết lộ toàn bộ Shadow & Hủy trang bị](#rc-07-ernest-exp1_ernest)
   - [RC-08: Elise (`exp2_elise`) — Mâu thuẫn phạm vi & lượng hồi máu](#rc-08-elise-exp2_elise)
   - [RC-09: N.C. Soldier (`exp2_nc_soldier`) — Cơ chế chiêu mộ, đổi phe & sở hữu vũ khí](#rc-09-nc-soldier-exp2_nc_soldier)
   - [RC-10: Ánh xạ Địa điểm Shadow Hunters, Khái niệm "Cùng khu vực" & Tên thẻ sang Bóng Đêm KTX](#rc-10-ánh-xạ-địa-điểm-shadow-hunters-khái-niệm-cùng-khu-vực--tên-thẻ-sang-bóng-đêm-ktx)
3. [Nhóm B — Các mâu thuẫn nội bộ bài nguồn & Thiếu metadata](#3-nhóm-b--các-mâu-thuẫn-nội-bộ-bài-nguồn--thiếu-metadata)
   - [RC-11: Usurper (`exp2_usurper`) & Umibozu (`exp2_umibozu`) — Lỗi tên kỹ năng & Trigger lộ diện](#rc-11-usurper-exp2_usurper--umibozu-exp2_umibozu)
   - [RC-12: Bipolar (`exp1_bipolar`) — Mâu thuẫn kỹ năng & Điều kiện thắng trong bài nguồn](#rc-12-bipolar-exp1_bipolar)
   - [RC-13: Diana (`exp2_diana`) — Mâu thuẫn đối tượng "Khách hàng" (Neutral vs Shadow/Hunter)](#rc-13-diana-exp2_diana)
   - [RC-14: Aaron (`exp2_aaron`) — Thiếu thuộc tính giới tính (`gender`) & Ràng buộc tấn công vợ](#rc-14-aaron-exp2_aaron)
   - [RC-15: Nhóm mốc máu / vết thương (`exp1_fallen`, `exp2_dalton`, `exp2_april_skipps`, `exp2_fujiko`)](#rc-15-nhóm-mốc-máu--vết-thương-exp1_fallen-exp2_dalton-exp2_april_skipps-exp2_fujiko)
4. [Nhóm C — Các trường hợp cần làm rõ chi tiết theo nhóm cơ chế](#4-nhóm-c--các-trường-hợp-cần-làm-rõ-chi-tiết-theo-nhóm-cơ-chế)
   - [RC-16: Phản ứng ngoài lượt & Cửa sổ ngắt (`exp1_gwendolen`, `exp1_cindy`, `exp1_arnold`, `exp1_undying`, `exp2_bianca`, `exp2_colt`, `exp2_gideon`)](#rc-16-phản-ứng-ngoài-lượt--cửa-sổ-ngắt)
   - [RC-17: Khu vực, Di chuyển & Hiệu ứng diện rộng (`exp1_fea`, `exp1_udi`, `exp1_wrath`, `exp1_angel`, `exp2_father_harrison`, `exp2_gloria`, `exp2_warlock`, `exp2_witch`, `exp2_warlord`, `exp2_bryon`)](#rc-17-khu-vực-di-chuyển--hiệu-ứng-diện-rộng)
   - [RC-18: Xúc xắc, Sát thương & Chuỗi tấn công phụ (`exp1_gayle`, `exp1_elysia`, `exp1_victor`, `exp1_vengeance`, `exp2_freyja`, `exp2_unchained`, `exp2_visions`)](#rc-18-xúc-xắc-sát-thương--chuỗi-tấn-công-phụ)
   - [RC-19: Rút bài, Điều tra & Thẻ Đen/Trắng/Xanh (`exp1_felicia`, `exp2_eleanor`, `exp2_urban_legend`, `exp2_cruz`, `exp2_arlene`)](#rc-19-rút-bài-điều-tra--thẻ-đentrắngxanh)
   - [RC-20: Điều kiện thắng phụ thuộc/sao chép/chuyển sát thương (`exp1_anathema`, `exp1_bethany`, `exp1_cassie`, `exp1_clairvoyant`)](#rc-20-điều-kiện-thắng-phụ-thuộcsao-chépchuyển-sát-thương)

---

## 1. Tổng quan thống kê & Quy tắc đối chiếu

| Phân loại | Số lượng nhân vật | Danh sách ID |
|---|---:|---|
| **`verified`** (Không có mâu thuẫn/mơ hồ trong nguồn) | **4** | `exp1_wendigo`, `exp2_g43`, `exp2_fiona`, `exp2_wyvern` |
| **`needs-clarification`** (Có mục `UNRESOLVED` trong tài liệu này) | **52** | Toàn bộ 52 nhân vật mở rộng còn lại |
| **`unknown`** (Không có thông số HP/phe/mô tả từ nguồn) | **0** | *(Tất cả 56 nhân vật đều trích xuất được từ 6 bài gốc)* |

> **Lưu ý chung về Quy tắc Lộ diện (Reveal Requirement):**
> Trong 6 bài viết nguồn của Thế Giới Board Game, nhiều nhân vật không ghi rõ câu *"Khi đã lộ diện"* trong câu mô tả kỹ năng (ví dụ `Gayle`, `Lloyd`, `Felicia`, `Ernest`, `Elysia`, `Gwendolen`, `Fea`, `Victor`, `Vengeance`, `Voodoo`, `Udi`, `Wrath`, `Bipolar`, `Bethany`, `Arnold`, `Cassie`, `Clairvoyant`, `Angel`, `Father Harrison`, `Gloria`, `Fujiko`, `Freyja`, `Gideon`, `Eleanor`, `Elise`, `Warlock`, `Witch`, `Visions`, `Warlord`, `Cain`, `Bonnie`, `Bianca`, `Colt`, `Cruz`, `Bryon`, `N.C. Soldier`). Theo luật gốc Shadow Hunters, mọi kỹ năng đặc biệt chỉ được dùng khi đã lộ diện (trừ trường hợp ghi rõ *"không cần lộ diện"* như `Unknown`/`Arlene`). Quy tắc này cần được chốt thành **Global Expansion Rule #0** trước Phase 2.

---

## 2. Nhóm A — 10 Hạng mục Trọng điểm bắt buộc phân tích sâu

### RC-01: Voodoo (`exp1_voodoo`)
- **Nhân vật liên quan:** `exp1_voodoo` (Expansion 1 — Shadow — 13 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh`

1. **Mô tả theo nguồn:**
   - *"Con rối: Bắt đầu lượt của bạn, chọn 1 người chơi: Bạn cướp lượt chơi của người đó, nhưng bạn không thể xem và sử dụng chức năng nhân vật đó. (Chỉ sử dụng 1 lần)"*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Thời điểm thực thi:** Voodoo điều khiển lượt nạn nhân **ngay lập tức** trong lượt hiện tại của Voodoo (trước/thay cho lượt Voodoo) hay **chờ đến lượt kế tiếp** của nạn nhân theo vòng?
   - **Lượt riêng của Voodoo:** Nếu thực thi ngay, Voodoo có còn được chơi lượt bình thường của mình không, và nạn nhân có bị mất lượt kế tiếp của họ không?
   - **Phạm vi hành động được phép điều khiển:** Voodoo điều khiển quân cờ của nạn nhân di chuyển, rút bài địa điểm và tấn công — vậy khi nạn nhân rút lá bài Điều tra (Xanh lá) hoặc nhận lá bài bí mật, **ai là người được xem thông tin bí mật đó** (Voodoo hay nạn nhân)? Voodoo có được dùng trang bị của nạn nhân (như `ev_masamune` (`ev-01`) / `ev_handgun` (`ev-05`)) hoặc bỏ/tặng trang bị của nạn nhân không?
   - **Nếu nạn nhân chết trước khi đến lượt (nếu áp dụng phương án trì hoãn):** Kỹ năng có bị mất lượt dùng 1 lần không?
3. **Ảnh hưởng đến engine hiện tại:**
   - `state-machine.ts` và `worker/src/boardgame-room.ts` giả định `activePlayerId === commandActorPlayerId` (chỉ duy nhất người đang tới lượt mới được gửi action).
   - `projections.ts` tính `privateView` hoàn toàn theo `viewerPlayerId`; nếu Voodoo điều khiển nạn nhân mà không tách biệt `controllerPlayerId` vs `actingPawnPlayerId`, rất dễ gây **lộ thông tin bí mật (P0 privacy leak)** như vai trò ẩn hoặc lá điều tra của nạn nhân.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Deferred Hijack — Chuẩn Shadow Hunters mở rộng phổ biến):** Đầu lượt Voodoo đánh dấu nạn nhân; khi tới lượt tiếp theo của nạn nhân, `controllerPlayerId = voodooId` điều khiển di chuyển, hiệu ứng địa điểm và tấn công của nạn nhân, không xem được vai ẩn, không kích hoạt `REVEAL_ROLE` hay `USE_SKILL` của nạn nhân; mọi thẻ Điều tra rút ra vẫn giữ riêng tư hoặc chuyển cho Voodoo tùy quy ước.
   - **Phương án B (Immediate Puppet Turn):** Đầu lượt Voodoo, chen ngay 1 lượt điều khiển quân cờ nạn nhân (và đánh dấu nạn nhân bị bỏ qua lượt kế tiếp), sau đó Voodoo tiếp tục (hoặc kết thúc) lượt của mình.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-02: Undead (`exp1_undead`)
- **Nhân vật liên quan:** `exp1_undead` (Expansion 1 — Shadow — 11 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh`

1. **Mô tả theo nguồn:**
   - *"Xác sống trỗi dậy: Chỉ lộ diện khi bạn chết. Sau đó, vào đầu lượt tiếp theo mình, bạn sẽ hồi sinh với số máu là 6 và chơi tiếp lượt đó như bình thường. (Chỉ sử dụng 1 lần)"*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Kiểm tra thắng thua khi Undead là Shadow cuối cùng:** Nếu Undead là Shadow duy nhất còn sống và bị hạ gục lần 1, phe Hunter có **thắng ngay lập tức** trước khi Undead kịp hồi sinh không, hay trạng thái `pendingResurrection` ngăn phe Hunter thắng cho đến khi Undead chết lần 2?
   - **Trạng thái trong khoảng chờ hồi sinh:** Từ lúc chết lần 1 tới đầu lượt kế tiếp, Undead có được tính vào `deadCount` (ảnh hưởng `Daniel` / `Charles` / `Valkyrie-style` / `Antimony` / `Vengeful Spirit` / `Wendigo` / `Gideon`) không? Có thể bị chọn làm mục tiêu bài/kỹ năng trong lúc đang chờ hồi sinh không?
   - **Trang bị khi chết lần 1:** Người kết liễu Undead lần 1 có được quyền cướp 1 trang bị (loot) như luật Classic trong `effects.ts` không? Số trang bị còn lại của Undead bị hủy bỏ hay giữ nguyên khi hồi sinh?
   - **Ngữ nghĩa "số máu là 6":** Trong bản gốc Shadow Hunters (thang vết thương 0 → 11), `6` có nghĩa là **6 HP còn lại (`hp = 6`)** hay **6 vết thương (`wounds = 6`, tức còn 5 HP)**?
   - **Điều kiện lộ diện:** *"Chỉ lộ diện khi bạn chết"* nghĩa là Undead bị cấm tự nhấn `REVEAL_ROLE` và có miễn nhiễm bị ép lộ diện bởi `Ernest` / `eq_mirror` hay không?
3. **Ảnh hưởng đến engine hiện tại:**
   - `effects.ts` (`applyDamage`) đặt `target.alive = false`, gán `firstDeadPlayerId`, mở `pendingLoot`, và gọi ngay `evaluateVictory(state)` trong cùng bước nguyên tử.
   - `state-machine.ts` (`advanceTurn`) bỏ qua toàn bộ người chơi có `alive === false` — nếu không có cờ `resurrectionPending` tách khỏi `alive`, lượt tiếp theo của Undead sẽ bị nhảy qua vĩnh viễn.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Pending Resurrection State):** Chết lần 1 đưa Undead vào trạng thái `dormant/pending_revive`: chưa tính là bị loại hoàn toàn cho điều kiện thắng phe Hunter, vẫn cho phép (hoặc không) cướp trang bị, không bị nhắm mục tiêu, `advanceTurn` vẫn dừng ở ghế Undead để hồi sinh `hp = 6` và `alive = true`.
   - **Phương án B (Full Death + Revive on Next Turn):** Chết lần 1 tính là chết thật (kích hoạt `firstDead`, `Gideon`, `Wendigo`, loot, và nếu là Shadow cuối cùng thì Hunter thắng ngay trước khi kịp hồi sinh); chỉ hồi sinh nếu trận đấu vẫn chưa kết thúc khi quay vòng lại lượt Undead.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-03: Bonnie (`exp2_bonnie`)
- **Nhân vật liên quan:** `exp2_bonnie` (Expansion 2 — Neutral — 10 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`

1. **Mô tả theo nguồn:**
   - **Điều kiện thắng:** *"Chiến thắng khi trở thành một phần của phe Shadow sau khi giành được vị trí từ một trong số chúng."*
   - **Kỹ năng đặc biệt — Nghi Thức Kế Thừa:** *"Khi giết chết một Shadow, bạn sẽ trở thành một Shadow và trở thành đồng đội của các Shadow khác."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Giết Shadow cuối cùng trên bàn:** Nếu Bonnie kết liễu Shadow cuối cùng còn sống, Bonnie có kịp chuyển thành Shadow **trước** khi `evaluateVictory` kiểm tra điều kiện thắng của phe Hunter (khiến trận đấu tiếp tục với Bonnie là Shadow mới) hay phe Hunter thắng ngay lập tức?
   - **Thay đổi phe động (Dynamic Allegiance):** Sau khi trở thành Shadow, Bonnie có bị tính là Shadow khi nhận thẻ Điều tra Xanh lá (`inv_shadow_hunter`, `inv_shadow_neutral`, v.v.), khi `Ernest` kích hoạt kỹ năng, khi `Wyvern` giết, hay khi đếm số Neutral còn sống (`Cindy`, `Angel`, `Bryon`, `N.C. Soldier`) không?
   - **Lộ diện bắt buộc:** Khi chuyển thành Shadow, Bonnie có bắt buộc lộ diện ngay lập tức không?
   - **Nguồn sát thương kết liễu:** *"Khi giết chết một Shadow"* có bao gồm kết liễu bằng thẻ Sự kiện Đen (ví dụ `Dynamite`, `Vampire Bat`, `Spider`) hay chỉ bằng đòn tấn công trực tiếp?
   - **Khi Bonnie chết trước khi giết Shadow hoặc không giết được Shadow nào:** Bonnie chắc chắn thua; nhưng sau khi đã trở thành Shadow rồi bị chết sau đó, nếu đồng đội Shadow thắng cuối trận thì Bonnie có thắng cùng phe Shadow không?
3. **Ảnh hưởng đến engine hiện tại:**
   - Hiện tại `player.faction` không tồn tại như trường động; toàn bộ `victory.ts` và `effects.ts` đọc `ROLES_BY_ID[player.roleId].faction` (tĩnh, bất biến).
   - Cần tách `baseFaction` (bất biến theo `roleId`) và `effectiveFaction` (động trên `PlayerState`) cùng thứ tự ưu tiên giữa `ON_ELIMINATION` hook và `ON_VICTORY_CHECK`.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Immediate Pre-Victory Conversion):** Hook `ON_ELIMINATION` chạy trước `ON_VICTORY_CHECK`; Bonnie lập tức cập nhật `effectiveFaction = 'shadow'`, lộ diện bắt buộc, vì thế dù giết Shadow cuối cùng thì phe Shadow vẫn còn 1 thành viên sống (Bonnie) và trận tiếp tục.
   - **Phương án B (Post-Victory Conversion):** Kiểm tra điều kiện thắng phe Hunter trước; nếu còn Shadow khác sống thì Bonnie mới kế thừa và gia nhập phe Shadow.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-04: Antimony (`exp1_antimony`) & Vengeful Spirit (`exp1_vengeful_spirit`)
- **Nhân vật liên quan:** `exp1_antimony` (Expansion 1 — Neutral — 8 HP), `exp1_vengeful_spirit` (Expansion 1 — Shadow — 13 HP)
- **Nguồn:**
  - `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`
  - `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh`

1. **Mô tả theo nguồn:**
   - **Antimony — Nhân bản:** *"Khi có 1 người chơi khác chết, bạn lộ diện thân phận của mình. Bạn sao chép hết kỹ năng và điều kiện thắng của người chơi đó. (Chỉ sử dụng 1 lần)."* | **Điều kiện thắng:** *"Sau khi kỹ năng kích hoạt thì mới có điều kiện thắng."*
   - **Vengeful Spirit — Quyền năng bất diệt:** *"Bạn có thể lộ diện ngay sau khi có 1 người chết. Sau đó, bạn có được kỹ năng của người đã chết cho đến hết trò chơi. (Chỉ sử dụng 1 lần)"* | **Điều kiện thắng (nguyên văn bài nguồn):** *"Tiêu diệt tất cả các Hunter hoặc Neutral."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Lỗi gõ điều kiện thắng của Vengeful Spirit trong bài nguồn:** Bài nguồn ghi *"Tiêu diệt tất cả các Hunter hoặc Neutral"* (thiếu số **`3`** so với toàn bộ 8 Shadow khác cùng bài đều ghi *"Tiêu diệt tất cả các Hunter hoặc 3 Neutral"*). Cần xác nhận có phải lỗi đánh máy của bài gốc hay không.
   - **Mâu thuẫn nội bộ bài nguồn của Vengeful Spirit:** Phần *Ưu điểm* ghi *"Bạn có thể chọn thời điểm lộ diện hợp lý để 'ăn cắp' kỹ năng của một nhân vật mạnh"*, nhưng ngay phần *Nhược điểm* lại ghi *"Kỹ năng của bạn hoàn toàn phụ thuộc vào người đầu tiên bị hạ gục."*
   - **Bắt buộc hay tùy chọn cho Antimony:** Antimony ghi *"Khi có 1 người chơi khác chết, bạn lộ diện..."* (không có từ *"có thể"*). Vậy Antimony **bắt buộc** sao chép người chết đầu tiên hay được quyền bỏ qua để chờ người chết sau?
   - **Sao chép điều kiện thắng vs Đổi phe (Antimony):** Nếu Antimony sao chép một Hunter/Shadow, Antimony có đổi `effectiveFaction` theo người đó (ảnh hưởng thẻ Điều tra và điều kiện đếm Hunter/Shadow còn sống) hay vẫn thuộc phe Neutral nhưng dùng điều kiện thắng của Hunter/Shadow?
   - **Sao chép kỹ năng đặc biệt có trạng thái hoặc đã tiêu hao:**
     - Nếu người chết đã dùng kỹ năng `once_per_match` (ví dụ `Franklin`/`George`/`Allie`/`Ernest`), Antimony/Vengeful Spirit có nhận được lượt dùng mới (`skillUsed = false`) không?
     - Nếu người chết là `Daniel` (chỉ thắng nếu là người chết đầu tiên) hoặc `Undead` (chỉ lộ diện khi chết — trong khi Antimony/Vengeful Spirit đã lộ diện rồi) hoặc một nhân vật sao chép khác (`Antimony` chết trước `Vengeful Spirit`) thì xử lý thế nào?
   - **Chết đồng thời (AoE như Dynamite / Machine Gun / Wrath):** Nếu 2 người chơi chết trong cùng 1 sự kiện, Antimony/Vengeful Spirit được chọn 1 trong 2 hay áp dụng theo thứ tự ghế?
3. **Ảnh hưởng đến engine hiện tại:**
   - Hiện `PlayerState` gắn cứng 1 `roleId` với 1 `skillUsed: boolean` và tra trực tiếp `ROLES_BY_ID[player.roleId]` cho cả skill lẫn victory.
   - Cần tách `copiedSkillRoleId`, `copiedVictoryRoleId`, `copiedSkillUsed`, và cơ chế hàng đợi chọn mục tiêu khi nhiều người chết đồng thời.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Fresh Copy, Preserved Base Faction):** Sao chép tạo bản ghi `effectiveSkillRoleId` với `skillUsed = false` mới; Antimony chỉ sao chép điều kiện thắng (giữ `effectiveFaction = 'wanderer'`); Vengeful Spirit được chọn thời điểm kích hoạt ở bất kỳ cái chết nào (chưa dùng lần 1), còn Antimony bắt buộc ở cái chết đầu tiên.
   - **Phương án B (First-Death Lock & Full Role Inheritance):** Cả hai khóa vào người chết đầu tiên (hoặc chọn nếu chết đồng thời); Antimony nhận luôn `effectiveFaction` của nạn nhân; chuẩn hóa điều kiện thắng Vengeful Spirit thành chuẩn Shadow (`Tất cả Hunter hoặc 3 Neutral`).
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-05: Cain (`exp2_cain`)
- **Nhân vật liên quan:** `exp2_cain` (Expansion 2 — Neutral — 11 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`

1. **Mô tả theo nguồn:**
   - **Điều kiện thắng:** *"Một Hunter, một Shadow và một Neutral khác ngoài bạn đã chết. Trong một ván chơi 5 người, giết một Hunter và một Shadow."*
   - **Kỹ năng đặc biệt — Nước Cờ Quyền Lực (dùng 1 lần trong trò chơi):** *"Bạn hồi số lượng máu bằng với tổng số người đang chơi. Và hai phe Hunter và Shadow được thêm 1 điều kiện thắng là 'Khi Cain chết'."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Khác biệt từ ngữ 5P vs 6–8P:** Bản 6–8 người ghi *"đã chết"* (ai giết cũng được), nhưng bản 5 người ghi *"giết một Hunter và một Shadow"* — vậy ở 5P, Cain có phải **tự tay kết liễu** cả 1 Hunter và 1 Shadow, hay chỉ là cách dịch khác của *"đã chết"*?
   - **Yêu cầu sống sót & Thời điểm thắng của Cain:** Cain có cần **còn sống** khi thỏa điều kiện (1H + 1S + 1N khác chết) không? Và Cain thắng **ngay lập tức** (solo trigger kết thúc trận ngay) hay phải chờ cuối trận?
   - **Mâu thuẫn thắng đồng thời khi Cain chết sau khi dùng kỹ năng:** Kỹ năng thêm điều kiện thắng *"Khi Cain chết"* cho **CẢ HAI** phe Hunter và Shadow. Khi Cain chết, **cả hai phe Hunter và Shadow cùng thắng** hay chỉ phe của người đã kết liễu Cain thắng? Nếu một Neutral giết Cain thì ai thắng?
   - **Lượng hồi máu "tổng số người đang chơi":** Tính theo tổng số người khởi tạo ván (4–8) hay chỉ số người **còn sống** tại thời điểm kích hoạt? (Lưu ý: phần *Ưu điểm* trong bài nguồn còn viết *"có thể hồi lên đến 6 máu"*, mâu thuẫn với ván 7–8 người nếu tính tổng người chơi).
3. **Ảnh hưởng đến engine hiện tại:**
   - `victory.ts` hiện giả định phe Hunter và phe Shadow loại trừ nhau hoàn toàn (`winners` là một nhóm phe + các Wanderer đủ điều kiện đi kèm, không có trường hợp cả Hunter lẫn Shadow cùng thắng trong 1 trận).
   - Cần hỗ trợ **Global Match Modifiers / Dynamic Victory Conditions** (gắn thêm điều kiện thắng cho phe khác trong runtime state) và quy tắc phân xử `Simultaneous Victory`.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Literal Both Factions Win + Alive Count Heal):** Khi Cain chết sau khi đã dùng kỹ năng, cả Hunter và Shadow đều thỏa điều kiện thắng (đồng thắng); lượng hồi máu bằng số người chơi còn sống; điều kiện thắng của Cain là solo-trigger ngay khi Cain còn sống và đủ số người chết theo phe.
   - **Phương án B (Killer's Faction Wins + Initial Player Count Heal):** Chỉ phe của người kết liễu Cain (hoặc cả hai phe nếu Cain tự chết/bị Neutral giết) nhận chiến thắng từ điều kiện *"Khi Cain chết"*; ở 5P Cain cần tự tay kết liễu đúng theo văn bản nguồn.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-06: Lloyd (`exp1_lloyd`)
- **Nhân vật liên quan:** `exp1_lloyd` (Expansion 1 — Hunter — 12 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-1-sha`

1. **Mô tả theo nguồn:**
   - *"Lạc lối: Bạn có thể ngăn chặn cuộc tấn công xảy ra bất cứ lúc nào bằng cách cho bản thân mất 2 máu."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Thời điểm ngắt (Interrupt Timing):** Lloyd chặn cuộc tấn công **trước khi kẻ tấn công đổ xúc xắc** hay **sau khi đã thấy kết quả xúc xắc/sát thương**?
   - **Phạm vi bảo vệ:** Lloyd có thể chặn cuộc tấn công xảy ra **ở bất kỳ đâu trên bản đồ** hay chỉ trong cùng khu vực/cụm với Lloyd? Có chặn được đòn đánh diện rộng (`ev_machine_gun` (`ev-06`)) hay phản công (`Werewolf`, `Gwendolen`, `Colt`) không?
   - **Hành vi tự sát khi HP <= 2:** Lloyd có được phép kích hoạt kỹ năng khi chỉ còn 1–2 HP (tự chết để cứu đồng đội) hay bị cấm?
   - **Tương tác lộ diện & đa người chơi:** Nếu Lloyd đang ẩn vai ở ngoài lượt của mình, game phải mở cửa sổ chờ phản ứng (reaction window) cho Lloyd — điều này có thể **làm lộ ngầm việc có Lloyd trong bàn** (timing side-channel leak) nếu server chỉ dừng chờ khi có người cầm Lloyd!
3. **Ảnh hưởng đến engine hiện tại:**
   - Engine hiện tại là **đồng bộ theo lượt đơn (single-actor synchronous turn loop)**, không có khái niệm reaction window ngoài lượt có timeout, cũng không có phase trung gian `AWAITING_ATTACK_REACTION` trước khi `resolveAttack` đổ xúc xắc.
   - Cần kiến trúc **Server-Authoritative Reaction Window** (có timer chống treo trận và chống lộ thông tin side-channel).
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Pre-Roll Global Interrupt, Revealed Only):** Chỉ mở cửa sổ phản ứng khi Lloyd **đã lộ diện** (loại bỏ hoàn toàn side-channel leak khi ẩn vai), kích hoạt trước khi đổ xúc xắc cho mọi đòn tấn công thường toàn bản đồ, thời gian chờ cố định (ví dụ 8s), cấm dùng nếu HP <= 2 (hoặc cho phép tự hi sinh).
   - **Phương án B (Post-Declaration Interrupt, Hidden Allowed via Pre-Arm Toggle):** Cho phép Lloyd bật sẵn công tắc *"Tự động/Hỏi chặn đòn"* bí mật ở client, nhưng yêu cầu cơ chế ẩn độ trễ mạng.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-07: Ernest (`exp1_ernest`)
- **Nhân vật liên quan:** `exp1_ernest` (Expansion 1 — Hunter — 10 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-1-sha`

1. **Mô tả theo nguồn:**
   - *"Từ đạo: Bạn có thể hy sinh 2 máu để tất cả các Shadow lộ diện và hủy tất cả trang bị của họ. (Chỉ sử dụng 1 lần)."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Tương tác với các vai có quy tắc ẩn đặc biệt:**
     - `Unknown` (Classic `suong-tin-gia` — Khánh "Tin Giả"): kỹ năng của Unknown chỉ áp dụng cho thẻ Điều tra hay có che được Ernest không?
     - `Undead` (`exp1_undead`): mô tả ghi *"Chỉ lộ diện khi bạn chết"* — Ernest có ép Undead lộ diện được không?
     - `Bonnie` (`exp2_bonnie`): trước khi giết Shadow là Neutral, sau khi giết Shadow đã thành Shadow — Ernest có ép Bonnie lộ diện sau khi Bonnie chuyển phe không?
   - **Tương tác phản ứng khi bị ép lộ diện:** Khi Ernest ép `Umibozu` (`exp2_umibozu`) lộ diện, kỹ năng `ON_ROLE_REVEAL` (gây 3 sát thương diện rộng) của Umibozu có kích hoạt ngay lập tức trong chuỗi giải quyết của Ernest không? Thứ tự lộ diện nhiều Shadow cùng lúc theo thứ tự ghế hay đồng thời?
   - **Nghĩa của "hủy tất cả trang bị":** Trang bị bị hủy đi vào **chồng bài bỏ (`equipmentDiscard`)** để xào lại khi hết bài hay bị **xóa vĩnh viễn khỏi trận**?
   - **Thời điểm kích hoạt & HP <= 2:** Ernest dùng ở pha nào trong lượt (đầu lượt, pha hành động, thay cho tấn công)? Có được hy sinh 2 máu khi chỉ còn <= 2 HP không?
3. **Ảnh hưởng đến engine hiện tại:**
   - `resolveRevealRole` trong `effects.ts` hiện chỉ nhận 1 `playerId` là chủ lượt tự lộ diện (`state.turn.currentPlayerId`). Chưa có cơ chế `forceRevealPlayers(playerIds, reason)` có thể gọi hàng loạt, phát chuỗi sự kiện `ON_ROLE_REVEAL` đệ quy an toàn và hủy hàng loạt trang bị.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Active Skill in Action Phase, Discard Pile, Undead Exempt):** Ernest dùng trong pha hành động (yêu cầu HP > 2 hoặc cho phép tự hi sinh); ép lộ diện mọi người chơi đang có `effectiveFaction === 'shadow'` ngoại trừ những vai ghi *"chỉ lộ diện khi chết"* (`Undead`); trang bị đưa vào `equipmentDiscard`; kích hoạt `ON_ROLE_REVEAL` theo thứ tự ghế bắt đầu từ Ernest.
   - **Phương án B (Absolute Force Reveal):** Ép lộ diện tất cả `effectiveFaction === 'shadow'` kể cả `Undead` (trừ khi quy định `Undead` được miễn).
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-08: Elise (`exp2_elise`)
- **Nhân vật liên quan:** `exp2_elise` (Expansion 2 — Hunter — 10 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-hunter-cua-ban-mo-rong-thu-2-p`

1. **Mô tả theo nguồn:**
   - **Kỹ năng đặc biệt — Âm Hưởng Mềm Mại:** *"Phân phát 5 máu cho tất cả các nhân vật ở cùng khu vực với bạn, bao gồm cả bản thân. (Chỉ sử dụng 1 lần)"*
   - **Phần Ưu điểm ngay bên dưới cùng bài viết:** *"Khả năng hồi 5 máu cho tất cả mọi người trong cùng khu vực, bao gồm cả bản thân, là một lợi thế cực kỳ lớn."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Mâu thuẫn định lượng trực tiếp trong cùng 1 bài nguồn:**
     - Câu mô tả kỹ năng ghi **"Phân phát 5 máu cho tất cả..."** (tổng quỹ hồi máu = **5 điểm**, chia tùy ý giữa các nhân vật ở cùng khu vực — ví dụ 3 người thì chia 2/2/1 hoặc 5/0/0).
     - Phần Ưu điểm lại diễn giải thành **"hồi 5 máu cho tất cả mọi người"** (mỗi người trong khu vực nhận tới **5 máu**!).
   - **Phạm vi "cùng khu vực":** Là cùng **1 Location đơn lẻ** hay cùng **1 Cụm (Cluster 2 Location)**?
   - **Thời điểm sử dụng trong lượt:** Dùng vào đầu lượt, pha hành động, hay thay cho tấn công?
   - **Tương tác cấm hồi máu:** Nếu trong khu vực có `Dalton` (đã kích hoạt cấm tự hồi máu) hoặc có `Usurper` đang lộ diện, quỹ phân bổ máu xử lý thế nào?
3. **Ảnh hưởng đến engine hiện tại:**
   - Nếu là **chia quỹ 5 điểm**, giao thức `BG_USE_SKILL` hiện tại chỉ nhận `{ targetPlayerId?: string }` — cần payload mới kiểu `allocations: Record<string, number>` với validation server `sum === 5` (hoặc `<= 5`), mọi target sống và ở đúng khu vực.
   - Nếu là **hồi 5 máu mỗi người**, chỉ cần 1 action không chọn phân bổ. Hai phương án khác hẳn nhau về cả cân bằng game lẫn UI/contract!
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Distribute 5 Total HP — Đúng nguyên văn câu Kỹ năng & chuẩn thẻ gốc tiếng Anh "Distribute 5 heal"):** Người chơi phân bổ tổng tối đa 5 điểm hồi máu cho tập nhân vật sống ở cùng Location (gồm Elise).
   - **Phương án B (Flat +5 HP Each — Theo đoạn Ưu điểm bài review):** Mọi nhân vật sống ở cùng khu vực (gồm Elise) đều hồi 5 HP.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-09: N.C. Soldier (`exp2_nc_soldier`)
- **Nhân vật liên quan:** `exp2_nc_soldier` (Expansion 2 — Neutral — 13 HP)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`

1. **Mô tả theo nguồn:**
   - **Điều kiện chiến thắng:** *"Chiêu mộ tất cả các nhân vật Neutral khác trong lúc chơi và thu thập đủ các lá bài 'Machine gun', 'Handgun', và 'Chainsaws'."*
   - **Kỹ năng đặc biệt — Chiêu Mộ:** *"Như một đòn tấn công trực tiếp, bạn có thể sử dụng kỹ năng 'Chiêu Mộ' thay cho một đòn tấn công thông thường lên một nhân vật Neutral. Nếu nhân vật đó chịu ít nhất 5 sát thương, nhân vật Neutral đó sẽ thay đổi điều kiện chiến thắng và Kỹ năng Đặc biệt để giống với bạn, sau đó họ sẽ chiến đấu về phe bạn."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Nhắm vào mục tiêu chưa lộ diện:** N.C. Soldier có thể tuyên bố dùng *"Chiêu Mộ"* lên một người chơi **chưa lộ diện** không? Nếu mục tiêu thực tế là Hunter/Shadow thì điều gì xảy ra (mất lượt tấn công, hay vẫn gây sát thương thường mà không chiêu mộ, và điều đó có vô tình làm lộ phe mục tiêu không)?
   - **Nghĩa của "chịu ít nhất 5 sát thương":** Là mục tiêu đã có tổng vết thương tích lũy `>= 5` (`maxHp - hp >= 5`), hay riêng đòn tấn công Chiêu Mộ phải gây `>= 5` sát thương (vốn cực khó với `|d6 - d4|`), hay sau khi đòn Chiêu Mộ gây sát thương khiến tổng vết thương của mục tiêu `>= 5`?
   - **Sở hữu 3 trang bị mục tiêu:** Sau khi chiêu mộ được đồng minh Neutral, 3 lá *"Machine gun"*, *"Handgun"*, *"Chainsaws"* phải do **một mình N.C. Soldier** cầm hay tính **tổng sở hữu của cả nhóm đã chiêu mộ**? (Trong `cards.ts` đã có đủ 3 lá tương ứng: `ev-06` `ev_machine_gun`, `ev-05` `ev_handgun`, `ev-03` `ev_chainsaw` — cần chốt tên hiển thị KTX trên mô tả UI).
   - **Trường hợp bất khả thi (5P hoặc Neutral khác chết):**
     - Trong trận **5 người**, chỉ có duy nhất **1 Neutral** (chính N.C. Soldier) -> không có Neutral khác để chiêu mộ! Điều kiện thắng tự thỏa mãn phần chiêu mộ hay N.C. Soldier bị cấm xuất hiện trong trận 5 người?
     - Nếu 1 Neutral khác bị chết **trước** khi được chiêu mộ, điều kiện *"chiêu mộ tất cả các nhân vật Neutral khác"* còn khả thi (chỉ tính Neutral còn sống) hay N.C. Soldier chắc chắn thua vĩnh viễn?
   - **Liên minh sau chiêu mộ:** Khi Neutral bị chiêu mộ đổi sang điều kiện thắng và kỹ năng của N.C. Soldier, họ có thể tiếp tục dùng *"Chiêu Mộ"* lên Neutral thứ 3 không? Trận đấu kết thúc ngay lập tức (solo/alliance trigger) khi đủ 3 vũ khí + chiêu mộ xong hay chờ cuối trận?
3. **Ảnh hưởng đến engine hiện tại:**
   - Đòi hỏi hệ thống **Dynamic Alliance / Shared Objective Group**, khả năng ghi đè runtime `effectiveSkill` + `effectiveVictory` cho nhiều người chơi khác nhau, cùng khả năng kiểm tra sở hữu bộ trang bị cụ thể theo canonical card tag.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Existing Wounds >= 5, Revealed Neutral Target, Shared Alliance Pool):** Chỉ chiêu mộ được Neutral đã lộ diện (hoặc mọi mục tiêu nhưng nếu không phải Neutral thì thành đòn đánh thường tránh leak); điều kiện chiêu mộ xét `wounds >= 5` (tổng vết thương); nhóm đã chiêu mộ cùng gom đủ 3 vũ khí tương ứng và thắng ngay lập tức.
   - **Phương án B (Single-Hit/Post-Hit Wounds >= 5, Solo Equipment Ownership, Exclude in 5P):** Cấm rút N.C. Soldier trong ván 5 người; N.C. Soldier phải tự cầm đủ 3 vũ khí; nếu bất kỳ Neutral nào chết chưa chiêu mộ thì không thể thắng.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-10: Ánh xạ Địa điểm Shadow Hunters, Khái niệm "Cùng khu vực" & Tên thẻ sang Bóng Đêm KTX
- **Nhân vật liên quan:** `exp1_angel`, `exp2_father_harrison`, `exp2_gloria`, `exp2_warlock`, `exp2_witch` (địa điểm đích danh); `exp1_gwendolen`, `exp1_udi`, `exp1_wrath`, `exp2_elise`, `exp2_umibozu`, `exp2_warlord`, `exp2_bryon` ("cùng khu vực"); `exp2_colt`, `exp2_cruz`, `exp2_bryon`, `exp2_nc_soldier` (tên thẻ Shadow Hunters gốc).

1. **Mô tả theo nguồn:**
   - **Địa điểm đích danh trong nguồn:**
     - `"Church" (Số 6)` — `Angel` (điều kiện thắng), `Father Harrison` (di chuyển thẳng), `Gloria` (rút 2 thẻ Trắng).
     - `"Erstwhile Altar"` — `Warlock` (+3 sát thương khi tấn công thành công).
     - `"Weird Woods"` — `Witch` (miễn nhận sát thương).
   - **Khái niệm `"cùng khu vực"`** xuất hiện ở 7 nhân vật (`Gwendolen`, `Udi`, `Wrath`, `Elise`, `Umibozu`, `Warlord`, `Bryon`).
   - **Tên thẻ bài gốc tiếng Anh Shadow Hunters** xuất hiện trực tiếp trong 4 nhân vật:
     - Vũ khí/Trang bị: `"Masamune"` (`Bryon`), `"Butcher Knife"`, `"Chainsaw"` / `"Chainsaws"`, `"Handgun"`, `"Rusted Broad Axe"` (`Colt`), `"Machine gun"` (`N.C. Soldier`).
     - Thẻ Đen (Event): `"Bloodthirsty Spider"`, `"Dynamite"`, `"Spiritual Doll"`, `"Vampire Bat"` (`Cruz`).
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Bảng đối chiếu Địa điểm KTX (`features/boardgame/domain/rules.ts`) vs Shadow Hunters gốc:**

| Số xúc xắc | Shadow Hunters gốc | Hiệu ứng SH gốc | Địa điểm Bóng Đêm KTX hiện tại (`rules.ts`) | Khớp cơ chế? |
|---|---|---|---|---|
| `2–3` | Hermit's Cabin | Rút thẻ Xanh (Hermit) | `radio` — Trạm Radio KTX (`investigation`) | Khớp 1-1 |
| `4–5` | Underworld Gate | Rút 1 trong 3 chồng bài | `breaker` — Cổng Hầm KTX (`any`) | Khớp 1-1 |
| **`6`** | **Church** | **Rút thẻ Trắng (White)** | **`lobby` — Sảnh Tầng 1 (`equipment`)** | **Khớp số 6 & rút Trắng — cần xác nhận ánh xạ & bản dịch UI** |
| **`8`** | **Cemetery** | **Rút thẻ Đen (Black)** | **`canteen` — Khu Sân Cũ Đêm (`event`)** | Khớp số 8 & rút Đen |
| **`9`** | **Weird Woods** | **Gây 2 sát thương hoặc Hồi 1 máu** | **`corridor` — Hành Lang Tầng 4 (`power-9`)** | **Khớp số 9 & hiệu ứng — cần xác nhận ánh xạ chính thức** |
| **`10`** | **Erstwhile Altar** | **Cướp 1 trang bị** | **`court` — Sân Bóng Rổ Đêm (`power-10`)** | **Khớp số 10 & hiệu ứng — cần xác nhận ánh xạ chính thức** |

   - **Cần chốt định nghĩa `"cùng khu vực"`:** Trong Shadow Hunters gốc, bàn có 6 **Location** ghép thành 3 **Area (Cluster 2 Location)** (được xáo cặp cụm ngẫu nhiên mỗi ván trong `state-machine.ts`), và tầm tấn công mặc định là cùng **Cluster** (`listReachableAttackTargets` trong `rules.ts`). Tiếng Việt bài nguồn dịch cả *"Location"* lẫn *"Area"* thành **"khu vực"**, dẫn đến mơ hồ nghiêm trọng cho 7 nhân vật:
     - `Gwendolen`, `Udi`, `Wrath`, `Elise`, `Umibozu`, `Warlord`, `Bryon` áp dụng trên **cùng 1 `LocationId`** hay **cùng 1 `ClusterId` (2 Location ghép cặp của ván đó)**?
   - **Đối chiếu Tên thẻ bài Shadow Hunters trong `features/boardgame/domain/cards.ts`:** Các lá bài tương đương **đều đã tồn tại 1-1** trong `cards.ts` (`ev-01`: `ev_masamune`, `ev-02`: `ev_butcher_knife`, `ev-03`: `ev_chainsaw`, `ev-04`: `ev_rusted_axe`, `ev-05`: `ev_handgun`, `ev-06`: `ev_machine_gun`, `ev-07`: `ev_vampire_bat`, `ev-08`: `ev_spider`, `ev-09`: `ev_dynamite`, `ev-10`: `ev_spiritual_doll`), nhưng tên hiển thị đã được Việt hóa theo chủ đề KTX. Cần bổ sung canonical tag chính thức và xác nhận khi viết văn bản UI cho `Colt`, `Cruz`, `Bryon`, `N.C. Soldier`.
3. **Ảnh hưởng đến engine hiện tại:**
   - Nếu không chuẩn hóa bảng ánh xạ `LocationAlias` (`church -> lobby`, `weird_woods -> corridor`, `erstwhile_altar -> court`), `AreaScope` (`'location' | 'cluster'`), và `CardCanonicalId`, mọi handler kỹ năng và điều kiện thắng liên quan ở Phase 2 sẽ mâu thuẫn nhau hoặc lỗi tham chiếu thẻ không tồn tại.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (1-to-1 Semantic Mapping + Area=Cluster):** Ánh xạ chính thức `Church (6) -> lobby`, `Weird Woods (9) -> corridor`, `Erstwhile Altar (10) -> court`; định nghĩa *"cùng khu vực"* bằng `Cluster` (cùng tầm tấn công, chuẩn tiếng Anh *"same Area"*) cho các kỹ năng không ghi tên địa điểm cụ thể; bổ sung trường `canonicalShId` trên mỗi lá bài trong `cards.ts` (kiểm tra đủ hay thiếu lá nào trước Phase 2).
   - **Phương án B (Strict Single-Location Area):** Định nghĩa *"cùng khu vực"* là đúng cùng `locationId` (nhỏ hơn Cluster) nhằm giảm sức mạnh AoE của `Wrath`/`Umibozu`/`Elise` và phòng thủ của `Udi`.
5. **Trạng thái:** **`UNRESOLVED`**

---

## 3. Nhóm B — Các mâu thuẫn nội bộ bài nguồn & Thiếu metadata

### RC-11: Usurper (`exp2_usurper`) & Umibozu (`exp2_umibozu`)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-shadow-cua-ban-mo-rong-thu-2-p`

1. **Mô tả theo nguồn:**
   - **Usurper:** *"Kỹ năng đặc biệt: Bạo lực vô tận: Khi bạn lộ diện nhân vật mình, thì những nhân vật khác không thể dùng 'Kỹ năng' hoặc 'Lá bài Trắng' để hồi máu. Bạn cũng có thể chọn lộ diện bản thân ở một lượt bất kỳ để chặn một lần hồi máu."*
   - **Umibozu:** *"Kỹ năng đặc biệt: (Lật úp): Khi nhân vật này đã lộ diện, tự nguyện hoặc bị ép, gây 3 sát thương cho toàn bộ nhân vật ở cùng khu vực với bạn. (Chỉ sử dụng 1 lần)."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Lỗi sao chép tên kỹ năng của Usurper:** Bài nguồn dán nhầm tên kỹ năng `"Bạo lực vô tận"` (vốn là tên kỹ năng của `Unchained` ngay phía trên!) cho `Usurper`.
   - **Thiếu tên kỹ năng của Umibozu:** Bài nguồn ghi `"(Lật úp)"` (là ghi chú kích hoạt, không phải tên kỹ năng).
   - **Cơ chế chặn hồi máu ngoài lượt của Usurper:** Câu 1 là aura cấm hồi máu liên tục khi đã lộ diện; câu 2 cho phép lộ diện ở lượt bất kỳ để chặn 1 lần hồi máu — cần cửa sổ reaction ngoài lượt khi có nguồn hồi máu (tương tự `Lloyd`). Đồng thời chưa rõ có chặn hồi máu từ địa điểm `Weird Woods / corridor (9)` hay hồi sinh `Undead` không.
   - **Phạm vi và tự sát thương của Umibozu:** *"toàn bộ nhân vật ở cùng khu vực với bạn"* có bao gồm **bản thân Umibozu** không? Nếu Umibozu bị lộ diện **vì bị giết chết**, kỹ năng gây 3 sát thương diện rộng có kích hoạt lúc chết không?
3. **Ảnh hưởng đến engine hiện tại:**
   - `effects.ts` hiện có 4 nơi hồi máu riêng lẻ không đi qua một `applyHeal` tập trung duy nhất hỗ trợ chặn/hủy bởi aura hoặc reaction ngoài lượt.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** Xác minh lại tên kỹ năng chuẩn cho `Usurper` và `Umibozu` với team thiết kế; với `Umibozu`, chỉ gây sát thương lên *người chơi khác* ở cùng Area (hoặc gồm cả bản thân nếu theo đúng chữ), kích hoạt cả khi bị ép lộ diện bởi `Ernest` nhưng không kích hoạt khi lộ diện do chết; với `Usurper`, chặn hồi máu qua hook `ON_HEAL` tập trung.
   - **Phương án B:** `Umibozu` gây sát thương cho tất cả mọi người kể cả bản thân và kích hoạt cả khi chết (kiểu bom cảm tử).
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-12: Bipolar (`exp1_bipolar`)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha`

1. **Mô tả theo nguồn:**
   - **Điều kiện thắng (mục nhân vật):** *"Còn sống khi phe Hunter thắng. Hoặc chết khi phe Shadow thắng."*
   - **Kỹ năng — Đồng xu định mệnh:** *"Bắt đầu lượt của bạn, bạn có thể chọn hồi máu hoặc nhận sát thương với xúc xắc 4 mặt cộng thêm 2 (từ 3 đến 6). (Chỉ sử dụng 1 lần)"*
   - **Mục Ưu điểm cùng bài:** *"Kỹ năng Đồng xu định mệnh mang lại sự lựa chọn giữa hồi máu và gây sát thương."*
   - **Mục Tổng kết cuối bài:** Ghi ngược điều kiện thắng khác với mục nhân vật.
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Mâu thuẫn tự gây sát thương vs gây sát thương lên người khác:** Mô tả kỹ năng ghi rõ **"nhận sát thương"** (tự gây d4+2 sát thương cho bản thân — hợp lý để tự chết nếu Shadow sắp thắng!), trong khi đoạn Ưu điểm viết nhầm thành **"gây sát thương"**.
   - **Trường hợp hòa/thắng riêng Neutral:** Nếu 1 Neutral khác thắng solo (kết thúc trận mà không phải Hunter hay Shadow thắng) thì Bipolar thua — nhưng nếu cả Hunter và Shadow đồng thắng (do `Cain`) thì Bipolar xử lý thế nào?
3. **Ảnh hưởng đến engine hiện tại:**
   - `victory.ts` hiện chỉ kiểm tra phe thắng qua `winningFaction`; cần đảm bảo Bipolar đọc kết quả phe thắng chung cuộc (`hunter` vs `shadow`) và không tạo vòng lặp kiểm tra điều kiện thắng.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** Bám sát nguyên văn câu Kỹ năng và Điều kiện thắng trong mục *Thông tin cơ bản* của Bipolar (tự hồi máu hoặc tự nhận d4+2 sát thương; sống khi Hunter thắng hoặc chết khi Shadow thắng).
   - **Phương án B:** Xác nhận lại với thẻ bài gốc trước khi triển khai Phase 2.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-13: Diana (`exp2_diana`)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`

1. **Mô tả theo nguồn:**
   - **Kỹ năng — Cho Thuê:** *"Neutral đầu tiên lộ diện sẽ trở thành khách hàng của bạn, bắt đầu từ lượt tiếp theo của họ và bạn sẽ lộ diện khi điều đó xảy ra."*
   - **Điều kiện thắng:** *"Điều kiện chiến thắng của bạn dựa trên khách hàng của bạn khi bạn còn sống. Nếu bạn không tìm thấy khách hàng của mình, thì bạn phải đầy máu khi trò chơi kết thúc."*
   - **Chiến thuật chơi (cùng bài):** *"Nếu khách hàng của bạn là một Shadow hoặc Hunter, bạn có thể giúp họ tiêu diệt phe đối địch."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Mâu thuẫn nghiêm trọng về đối tượng khách hàng:** Câu mô tả kỹ năng ghi **"Neutral đầu tiên lộ diện"**, nhưng đoạn Chiến thuật chơi ngay bên dưới lại nói khách hàng có thể là **"Shadow hoặc Hunter"** (tức *"người chơi đầu tiên lộ diện"* bất kể phe!).
   - **Thời điểm có hiệu lực:** *"bắt đầu từ lượt tiếp theo của họ"* — nếu khách hàng chết trước lượt tiếp theo của họ hoặc trận kết thúc trước lượt tiếp theo của họ, Diana đã có khách hàng chưa?
   - **Trận 5 người (nếu chỉ chọn Neutral):** Trong ván 5 người chỉ có 1 Neutral duy nhất là Diana -> không bao giờ có Neutral khác lộ diện!
   - **Lộ diện do chết:** Nếu một nhân vật lộ diện vì bị giết chết thì có bị tính là *"đầu tiên lộ diện"* không?
3. **Ảnh hưởng đến engine hiện tại:**
   - Cần lưu `clientPlayerId` và `clientActiveFromTurn` trong runtime state mở rộng, cùng evaluator `CopiedVictory` có kiểm tra thêm điều kiện *"Diana còn sống"* và fallback *"đầy máu cuối trận"*.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Any First Revealed Other Player):** Khách hàng là **nhân vật bất kỳ** đầu tiên lộ diện (trừ Diana) — khớp phần Chiến thuật và khả thi trong ván 5 người.
   - **Phương án B (First Revealed Other Neutral):** Bám đúng chữ *"Neutral đầu tiên lộ diện"*; trong ván 5P Diana luôn rơi vào nhánh fallback đầy máu.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-14: Aaron (`exp2_aaron`)
- **Nguồn:** `https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2`

1. **Mô tả theo nguồn:**
   - **Điều kiện thắng:** *"Bạn và người vợ của bạn còn sống khi trò chơi kết thúc. Nếu bạn không tìm thấy vợ của mình, chết trước khi trò chơi kết thúc."*
   - **Kỹ năng — Yêu Từ Cái Nhìn Đầu Tiên:** *"Nhân vật nữ đầu tiên lộ diện sẽ trở thành vợ của bạn. Lộ diện bản thân, và kể thời điểm đó trở đi, bạn có thể không tấn công vợ mình."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Thiếu hoàn toàn thuộc tính `gender` trong hệ thống 66 nhân vật:** Hiện `roles.ts` (10 tướng Classic Bách Khoa) và `character-catalog.json` (56 tướng mở rộng) chưa có bảng phân loại `gender: 'male' | 'female' | 'other'` chính thức (ví dụ: `G43` là cỗ máy, `Unknown`/`Vengeful Spirit`/`Umibozu`/`Urban Legend`/`Visions`/`N.C. Soldier` không rõ giới tính, `April & Skipps` là cô bé + mèo, và 10 nhân vật KTX Classic có giới tính khác một phần so với 10 nhân vật Shadow Hunters gốc!).
   - **Lỗi dịch câu cấm tấn công:** *"bạn có thể không tấn công vợ mình"* vs *"bạn không thể tấn công vợ mình"* (từ tiếng Anh *"you may not attack"* = **cấm tấn công**, dịch sát chữ bị thành *"có thể không tấn công"*!).
   - **Tương tác `ev_masamune` (`ev-01`) & `ev_machine_gun` (`ev-06`):** Nếu Aaron cầm Masamune (bắt buộc tấn công) và chỉ có vợ trong tầm, hoặc cầm Machine Gun (đánh toàn cụm có vợ), quy tắc nào ưu tiên?
   - **Lộ diện do chết:** Nhân vật nữ đầu tiên bị giết chết (lộ diện khi chết) có trở thành vợ của Aaron không?
3. **Ảnh hưởng đến engine hiện tại:**
   - Yêu cầu thêm metadata `gender` được duyệt cho toàn bộ 66 nhân vật (kể cả 10 nhân vật Classic Bách Khoa) và filter mục tiêu trong `getAttackableTargets`.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** Bổ sung trường `gender` chính thức vào Character Metadata (duyệt trước Phase 2); hiểu *"you may not attack"* là **cấm tấn công vợ** (loại trừ khỏi danh sách mục tiêu hợp lệ và bỏ qua khỏi splash Machine Gun); chỉ kích hoạt trên nhân vật nữ lộ diện khi còn sống.
   - **Phương án B:** Chỉ cho phép Aaron bỏ qua tấn công kể cả khi mang Masamune (optional skip).
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-15: Nhóm mốc máu / vết thương (`exp1_fallen`, `exp2_dalton`, `exp2_april_skipps`, `exp2_fujiko`)
- **Nguồn:** `exp1-hunter.txt`, `exp2-hunter.txt`, `exp2-neutral.txt`

1. **Mô tả theo nguồn:**
   - **Fallen (12 HP):** *"Bạn chỉ có thể lộ diện khi từ 8 máu trở lên. Miễn là bạn từ 8 máu trở lên khi tấn công thành công thì được tăng thêm 2 sát thương."*
   - **Dalton (13 HP):** *"Lộ diện nhân vật của bạn khi chạm mức 12 máu. Từ thời điểm đó, bạn không thể tự hồi máu cho bản thân mình."* | **Thắng:** *"Hạ gục một nhân vật sau khi kích hoạt kỹ năng 'Vòng đấu thứ 12'. Mặt khác, phải là người còn nhiều máu nhất khi trò chơi kết thúc."*
   - **April & Skipps (8 HP):** *"Bạn phải lộ diện khi máu mình đang ở ô số 7."* | **Thắng:** *"Không lộ diện nhân vật khi trò chơi kết thúc. Nếu nhân vật bị lộ diện do kỹ năng của mình, thì bạn hãy cố gắng sống sót đến cuối lượt tiếp theo của mình, nếu làm được điều đó bạn sẽ chiến thắng."*
   - **Fujiko (12 HP):** *"Đòn tấn công thành công của bạn sẽ ngay lập tức hạ gục 1 nhân vật đã lộ diện chỉ còn 4 máu."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Xung đột hệ đo lường Shadow Hunters (Wound Track tăng từ 0 -> maxHp) vs Bóng Đêm KTX (HP Remaining giảm từ maxHp -> 0):**
     - **Dalton (13 HP):** *"chạm mức 12 máu"* nghĩa là **nhận >= 12 vết thương (tức còn đúng 1 HP — đúng tinh thần "Vòng đấu thứ 12" sinh tử)** hay **còn 12 HP (chỉ mới mất 1 máu)**? Ngoài ra phần *"Mặt khác, phải là người còn nhiều máu nhất"* cần làm rõ khi có nhiều người hòa nhau mức HP cao nhất.
     - **April & Skipps (8 HP):** *"ở ô số 7"* trên thanh vết thương là **7 vết thương (còn 1 HP!)** hay còn 7 HP? Nếu April đang ở 5 vết thương rồi nhận đòn 3 sát thương (chết luôn, bỏ qua ô 7) thì chết luôn; nếu ở 6 vết thương rồi nhận 1 sát thương -> đúng ô 7; nhưng nếu hồi máu sau đó rồi lại xuống ô 7 thì sao? Thời hạn *"đến cuối lượt tiếp theo của mình"* tính từ lượt hiện tại nếu kích hoạt trong lượt April (ví dụ tự dính sát thương) hay sang vòng sau?
     - **Fallen (12 HP):** *"từ 8 máu trở lên"* là **đã nhận >= 8 vết thương (còn <= 4 HP — đúng tên "Sự chống cự")** hay **còn >= 8 HP**?
     - **Fujiko (12 HP):** *"chỉ còn 4 máu"* là `hp <= 4` hay `hp === 4`? Kiểm tra **trước** hay **sau** khi trừ sát thương của chính đòn tấn công đó?
3. **Ảnh hưởng đến engine hiện tại:**
   - Trong `types.ts`, `PlayerState` lưu `hp` (giảm dần từ `maxHp` về `0`), trong khi Shadow Hunters bàn giấy dùng thanh vết thương `damageTaken = maxHp - hp` (tăng dần từ `0` lên `maxHp`). Hiểu nhầm 1 trong 4 nhân vật trên sẽ đảo ngược hoàn toàn gameplay của nhân vật đó!
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A (Shadow Hunters Wound-Track Canonical):** Quy đổi rõ trên `damageTaken = maxHp - hp`: `Fallen` (`damageTaken >= 8`, tức `hp <= 4`), `Dalton` (`damageTaken >= 12`, tức `hp === 1`), `April & Skipps` (`damageTaken === 7`, tức `hp === 1`), `Fujiko` (`target.hp <= 4` sau khi đánh trúng hoặc trước khi đánh trúng).
   - **Phương án B (Remaining-HP Literal):** Đọc theo `hp` còn lại (`Fallen: hp >= 8`, `Dalton: hp <= 12`, `April: hp === 7`, `Fujiko: hp <= 4`).
5. **Trạng thái:** **`UNRESOLVED`**

---

## 4. Nhóm C — Các trường hợp cần làm rõ chi tiết theo nhóm cơ chế

### RC-16: Phản ứng ngoài lượt & Cửa sổ ngắt
- **Nhân vật liên quan:** `exp1_gwendolen`, `exp1_cindy`, `exp1_arnold`, `exp1_undying`, `exp2_bianca`, `exp2_colt`, `exp2_gideon`

1. **Mô tả theo nguồn:**
   - **`exp1_gwendolen` (Sự che chở):** *"Bạn có thể tấn công lại cho những Hunter hoặc Neutral đã bị tấn công trong khu vực đó."*
   - **`exp1_cindy` (Con ác mộng):** *"Khi bạn nhận sát thương, bạn có thể tiết lộ nhân vật (hoặc đã lộ diện) gây lại người tấn công 1 sát thương."* | **Thắng:** *"Tất cả Neutral chết và bạn còn sống."*
   - **`exp1_arnold` (Số phận thay đổi):** *"Khi bạn nhận sát thương và chết, thay vào đó, bạn sẽ không chết và chuyển toàn bộ số sát thương kết liễu cho người đã gây cho bạn. (Chỉ sử dụng 1 lần)."* | **Thắng:** *"Bạn còn sống và trên bàn chơi có nhiều hơn 2 người khi trò chơi kết thúc."*
   - **`exp1_undying` (Mạ Sắt):** *"Mỗi khi bạn nhận 2 hoặc nhiều sát thương, bạn có thể lộ diện (hoặc đã lộ diện) thì sát thương nhận được giảm đi 1."*
   - **`exp2_bianca` (Mọi Thứ Phế Liệu):** *"Bạn có thể bỏ một trang bị để vô hiệu sát thương từ một nguồn sát thương đơn mục tiêu."* | **Thắng:** *"Bạn có lượng máu còn lại thấp nhất trong tất cả các nhân vật còn sống khi trò chơi kết thúc."*
   - **`exp2_colt` (Công Lý Đường Phố):** *"Bạn có thể ngay lập tức tấn công bất cứ nhân vật nào đang cướp trang bị từ bạn. Nếu bạn gây được 2 thiệt hại trở lên bằng cách này, bạn có thể chọn lấy lại vật phẩm đó thay vì gây sát thương."* | **Thắng:** *"Sở hữu từ 3 trang bị trở lên có tên: 'Butcher Knife', 'Chainsaw', 'Handgun', hoặc 'Rusted Broad Axe'."*
   - **`exp2_gideon` (Phần Thưởng Nhiệm Vụ):** *"Bạn có thể lập tức rút và dùng 3 'Thẻ bài trắng' sau khi một Shadow bị hạ gục."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Gwendolen:** Nạn nhân Hunter/Neutral có cần đã lộ diện không? Phản công có được dùng vũ khí/buff của Gwendolen và có bị `Werewolf` phản công ngược lại (vòng lặp phản công) không? Có giới hạn 1 lần/lượt không?
   - **Cindy:** *"Khi bạn nhận sát thương"* có kích hoạt với sát thương thẻ bài Đen/kỹ năng ngoài đòn tấn công không? Trong ván 5 người (Cindy là Neutral duy nhất), điều kiện *"Tất cả Neutral [khác] chết và bạn còn sống"* có tự động thỏa mãn từ đầu không?
   - **Arnold:** Nếu Arnold nhận sát thương chí mạng không có nguồn người chơi (ví dụ `Dynamite` / `Weird Woods` / tự rút bài Đen) thì ai chịu sát thương phản? Sau khi chặn chết, HP của Arnold giữ nguyên ở mức trước đòn đánh hay về `1`? Có tạo vòng lặp nếu 2 hiệu ứng phản sát thương gặp nhau (`Arnold` vs `Cindy` / `Anathema`) không?
   - **Undying:** Có áp dụng cho sát thương thẻ bài/kỹ năng không hay chỉ đòn đánh? Nếu Undying cầm `eq_holy_robe` (`eq-01`) (-1 sát thương), kiểm tra ngưỡng `>= 2` trước hay sau `eq_holy_robe` (`eq-01`)?
   - **Bianca:** Có được bỏ `ev_masamune` (`ev-01`) (vũ khí bị nguyền) không? Nguồn *"đơn mục tiêu"* có bao gồm thẻ Sự kiện chọn 1 người (`Vampire Bat`, `Spiritual Doll`) hay kỹ năng (`George`, `Franklin`)? Nếu nhiều người sống cùng có lượng HP thấp nhất cuối trận (hòa), Bianca có thắng không?
   - **Colt:** Khi bị cướp trang bị từ xa (nhờ `court` / thẻ bài Đen), Colt có phản công xuyên tầm đánh được không? Ánh xạ 4 tên vũ khí (`Butcher Knife`, `Chainsaw`, `Handgun`, `Rusted Broad Axe`) sang `cards.ts` (trong `cards.ts` đã có đủ cả 4 lá: `ev-02` `ev_butcher_knife`, `ev-03` `ev_chainsaw`, `ev-04` `ev_rusted_axe`, `ev-05` `ev_handgun` — cần chốt tên hiển thị KTX).
   - **Gideon:** Có kích hoạt ngoài lượt khi người chơi khác kết liễu Shadow không? Là `once_per_match` hay mỗi lần có 1 Shadow chết? Rút 3 thẻ Trắng có bắt buộc dùng hết cả 3 ngay (kể cả thẻ cần chọn mục tiêu như `First Aid`, `Blessing`) hay rút lần lượt từng lá?
3. **Ảnh hưởng đến engine hiện tại:**
   - Toàn bộ 7 nhân vật đều cần **Reaction Window / Out-of-Turn Prompt Queue** và **Damage Source Attribution** (`sourcePlayerId`, `sourceKind`, `isSingleTarget`, `canCounterattack`) kèm **Recursion Guard**.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** Chuẩn hóa 1 hệ thống `PendingReaction` có timeout trên server; cấm phản công chuỗi vô hạn (`isCounterattack: true` không kích hoạt phản công tiếp); `Bianca` thắng khi `hp === minAliveHp` (cho phép hòa); `Cindy` trong 5P được hiểu là có >= 1 Neutral khác hoặc ngoại lệ 5P; `Gideon` rút tuần tự từng thẻ Trắng trong 3 bước.
   - **Phương án B:** Các phản ứng tùy chọn chỉ tự động nhắc khi nhân vật đã lộ diện (tránh timing leak), còn khi ẩn vai cần thao tác pre-arm.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-17: Khu vực, Di chuyển & Hiệu ứng diện rộng
- **Nhân vật liên quan:** `exp1_fea`, `exp1_udi`, `exp1_wrath`, `exp1_angel`, `exp2_father_harrison`, `exp2_gloria`, `exp2_warlock`, `exp2_witch`, `exp2_warlord`, `exp2_bryon`

1. **Mô tả theo nguồn:**
   - **`exp1_fea`:** *"Bạn có thể tăng hoặc giảm 1 nút cho mỗi lần gieo xúc xắc di chuyển."*
   - **`exp1_udi`:** *"Bạn không thể bị tấn công khi có 2 hoặc nhiều người chơi khác đang ở cùng khu vực với bạn."*
   - **`exp1_wrath`:** *"Bắt đầu lượt của bạn, bạn có thể cho tất cả người chơi đang ở cùng khu vực của bạn nhận 2 sát thương."*
   - **`exp1_angel`:** *"Sau khi bắt đầu lượt tiếp theo của bạn, tất cả Neutral đã lộ diện không nhận bất kỳ sát thương nào. (Chỉ sử dụng 1 lần)."* | **Thắng:** *"Tất cả Neutral còn sống hoặc bạn đứng khu vực 'Church' (Số 6) khi trò chơi kết thúc."*
   - **`exp2_father_harrison`:** *"Khi di chuyển, bạn có thể chọn di chuyển vào 'Church' (Nhà thờ) thay cho đổ xí ngầu."*
   - **`exp2_gloria`:** *"Lấy 2 thẻ trắng thay vì 1 khi đi vào khu vực 'Church' (Nhà thờ)."*
   - **`exp2_warlock`:** *"Đòn tấn công thành công của bạn sẽ gây thêm 3 sát thương nếu bạn đang đứng ở 'Erstwhile Altar'."*
   - **`exp2_witch`:** *"Bạn không nhận sát thương khi đang ở trong 'Weird Woods'."*
   - **`exp2_warlord`:** *"Trong giai đoạn di chuyển, bạn có thể chọn một người chơi để kéo người đó tới cùng khu vực với bạn và ngay lập tức tấn công người đó như một hành động thêm trong lượt, sau đó bạn chơi như bình thường. (Chỉ sử dụng 1 lần)."*
   - **`exp2_bryon`:** *"Trước khi bạn tấn công, bạn có thể tự do trao tặng bất kỳ số lượng trang bị của bản thân mình cho nhân vật Neutral đã lộ diện ở cùng khu vực với mình. Ngoại trừ 'Masamune'."* | **Thắng:** *"Không có Neutral nào chết khi trò chơi kết thúc."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Ánh xạ địa điểm & phạm vi `"cùng khu vực"`** (xem thêm `RC-10`): `Church (6)` -> `lobby`, `Weird Woods (9)` -> `corridor`, `Erstwhile Altar (10)` -> `court`; và ranh giới `Location` vs `Cluster`.
   - **Fea:** Khi tổng xúc xắc là `2` có được giảm xuống `1` không? Tổng `10` có được tăng lên `11` không? Nếu đổ `6` tăng thành `7` có được quyền chọn bất kỳ ô nào (luật số 7) không? Và nếu điều chỉnh ra đúng ô đang đứng có vi phạm luật Classic *"không được đứng yên ở ô cũ"* không?
   - **Udi:** *"không thể bị tấn công"* có chặn sát thương lan của `ev_machine_gun` (`ev-06`) (đánh cả cụm) hoặc phản công `Werewolf` không?
   - **Wrath:** *"tất cả người chơi đang ở cùng khu vực của bạn"* có gây 2 sát thương cho **bản thân Wrath** hay chỉ những người chơi *khác*?
   - **Angel:** Câu *"Sau khi bắt đầu lượt tiếp theo của bạn"* kéo dài thời hạn miễn sát thương bao lâu (từ lúc kích hoạt cho đến đầu lượt tiếp theo, hay từ đầu lượt tiếp theo cho đến hết lượt/hết vòng/hết trận)?
   - **Father Harrison:** Nếu đang đứng sẵn ở `lobby` (Church), có được dùng kỹ năng ở lại `lobby` để rút thêm thẻ Trắng liên tiếp không (ngược luật Classic không đứng yên tại chỗ)?
   - **Gloria:** Rút 2 thẻ Trắng được **giữ & dùng cả 2** hay chọn 1 bỏ 1? Thứ tự giải quyết khi 2 thẻ đều là thẻ dùng ngay có lựa chọn?
   - **Witch:** Miễn sát thương tại `corridor` (Weird Woods) có miễn cả sát thương tự gây (như hiệu ứng ô `corridor`, `Dynamite`, kỹ năng đồng minh) hay chỉ sát thương từ đối thủ?
   - **Warlord:** Kéo nạn nhân xảy ra **trước** hay **sau** khi Warlord di chuyển? Nạn nhân bị kéo vào ô mới có kích hoạt hiệu ứng ô không? Warlord sau đó có được tấn công lại cùng nạn nhân đó lần thứ 2 trong pha tấn công bình thường không?
   - **Bryon:** Có được tặng trang bị ngay cả khi Bryon chọn **bỏ qua tấn công** không? Trong ván 5 người (Bryon là Neutral duy nhất), Bryon có cần sống sót để thắng không (rõ ràng có, vì Bryon cũng là 1 Neutral).
3. **Ảnh hưởng đến engine hiện tại:**
   - Cần tách rõ khái niệm `MoveModifier`, `TargetEligibilityFilter`, `AreaScope`, `TimedAuraEffect` (tự hết hạn theo turn counter của chủ nhân), và hành động thưởng trong pha `MOVE`.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** Mọi kỹ năng ghi tên địa điểm cụ thể ánh xạ 1-1 theo số xúc xắc (`6/9/10`); `Wrath` chỉ gây sát thương cho người chơi khác; `Angel` bảo vệ từ lúc kích hoạt cho đến đầu lượt kế tiếp của Angel; `Fea` chỉ cho phép chỉnh sang tổng hợp lệ `[2..10]` (có tính 7) và vẫn tuân luật di chuyển sang ô khác; `Father Harrison` chỉ dùng khi chưa ở `lobby`.
   - **Phương án B:** Cho phép `Father Harrison` ở lại `lobby`; `Angel` kích hoạt trễ sau đầu lượt kế tiếp kéo dài 1 vòng.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-18: Xúc xắc, Sát thương & Chuỗi tấn công phụ
- **Nhân vật liên quan:** `exp1_gayle`, `exp1_elysia`, `exp1_victor`, `exp1_vengeance`, `exp2_freyja`, `exp2_unchained`, `exp2_visions`

1. **Mô tả theo nguồn:**
   - **`exp1_gayle`:** *"Bạn có thể đổ lại xúc xắc đánh 1 lần nữa. Nếu làm vậy, bạn bắt buộc lấy kết quả thứ 2."* (Phần Ưu điểm lại ghi *"tấn công/di chuyển"*).
   - **`exp1_elysia`:** *"Nếu bạn tấn công thành công gây sát thương nhỏ hơn 3, bạn có thể tăng thêm 2 sát thương."*
   - **`exp1_victor`:** *"Mỗi lần bạn tấn công thành công, bạn có thể nhận 1 sát thương để tăng thêm 2 sát thương cho cuộc tấn công của bạn."*
   - **`exp1_vengeance`:** *"Sau khi bạn giết được bất kỳ người chơi khác, bạn có thể chọn 2 người chơi khác để nhận sát thương với xúc xắc 4 mặt. (Chỉ sử dụng 1 lần)"*
   - **`exp2_freyja`:** *"Sau khi tấn công, bạn có thể bỏ thẻ bài trang bị bị tấn công thêm 1 lần nữa, số lần tấn công tương ứng với số trang bị mà bạn bỏ."*
   - **`exp2_unchained`:** *"Khi nhân vật này đã lộ diện, bạn gây thêm 2 sát thương khi tấn công."*
   - **`exp2_visions`:** *"Chọn một nhân vật vào đầu lượt của bạn. Bạn không thể tấn công nhân vật này nữa, và suốt phần còn lại của trò chơi, nhân vật bạn chọn sẽ mất 1 máu vào đầu lượt của bạn. (Chỉ sử dụng 1 lần)."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Gayle:** Mâu thuẫn giữa câu kỹ năng (*"xúc xắc đánh"*) và phần Ưu điểm (*"tấn công/di chuyển"*). Đồng thời khi dùng `ev_masamune` (`ev-01`) (chỉ đổ 1 d4), đổ lại chỉ đổ d4 hay d6+d4?
   - **Elysia:** Điều kiện `sát thương < 3` tính trên **hiệu xúc xắc gốc (`|d6 - d4|`)** hay **sau khi cộng vũ khí (`ev_rusted_axe` (`ev-04`)/`eq_spear`/`ev_chainsaw` (`ev-03`)) và trừ giáp (`eq_holy_robe` (`eq-01`))**?
   - **Victor:** Có được kích hoạt khi còn `1 HP` (tự sát cùng mục tiêu) không? Khi dùng `ev_machine_gun` (`ev-06`) đánh nhiều mục tiêu, trả 1 máu tăng cho toàn bộ hay từng mục tiêu?
   - **Vengeance:** Đổ **1 xúc xắc d4 chung** cho cả 2 mục tiêu hay **2 xúc xắc d4 riêng biệt**? Nếu trên bàn chỉ còn 1 người chơi sống khác ngoài Vengeance, có được chọn 1 người không?
   - **Freyja:** Bài nguồn lỗi chữ *"bị tấn công"* (ý nghĩa đúng là *"để tấn công"*). Có được bỏ `ev_masamune` (`ev-01`) không? Các đòn đánh phụ có thể đổi mục tiêu khác trong tầm hay phải đánh cùng mục tiêu, và bỏ trang bị diễn ra 1 lần hay tuần tự từng đòn?
   - **Unchained:** Khác với `Warlock`/`Fallen`/`Elysia` ghi *"tấn công thành công"*, Unchained chỉ ghi *"khi tấn công"*. Khi đổ xúc xắc đánh hụt (`d6 === d4`, sát thương gốc = 0), Unchained có vẫn gây `2` sát thương không?
   - **Visions:** Lệnh *"không thể tấn công nhân vật này nữa"* xử lý thế nào khi Visions cầm `ev_machine_gun` (`ev-06`) (đánh cả cụm) hoặc `ev_masamune` (`ev-01`) (bắt buộc đánh khi chỉ có mục tiêu này trong tầm)?
3. **Ảnh hưởng đến engine hiện tại:**
   - Cần tách rõ giai đoạn `rollAttackDice` (cho `Gayle`/`Fiona`), pipeline `BEFORE_DAMAGE` có thứ tự ưu tiên rõ ràng giữa `baseRoll` vs `equipmentModifiers` vs `roleModifiers` (cho `Elysia`/`Victor`/`Unchained`), và hỗ trợ `extraAttackCount` (cho `Freyja`/`Warlord`).
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** `Gayle` chỉ áp dụng xúc xắc tấn công theo nguyên văn kỹ năng; `Elysia` xét sát thương cuối sau trang bị (hoặc xét `baseRoll`); `Unchained` chỉ cộng +2 khi tấn công trúng (`baseRoll > 0` như quy ước Classic); `Vengeance` đổ 1 lần d4 áp cho tối đa 2 mục tiêu; `Freyja` không được bỏ `ev_masamune` (`ev-01`) và có thể chọn lại mục tiêu mỗi đòn.
   - **Phương án B:** `Unchained` gây +2 kể cả khi `d6 === d4`; `Gayle` áp dụng cho cả di chuyển và tấn công; `Vengeance` đổ d4 riêng cho từng mục tiêu.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-19: Rút bài, Điều tra & Thẻ Đen/Trắng/Xanh
- **Nhân vật liên quan:** `exp1_felicia`, `exp2_eleanor`, `exp2_urban_legend`, `exp2_cruz`, `exp2_arlene`

1. **Mô tả theo nguồn:**
   - **`exp1_felicia`:** *"Mỗi lần lấy bài, lấy 2 lá, chọn 1 lá và lá còn lại hủy."*
   - **`exp2_eleanor`:** *"Trong giai đoạn tấn công, bạn có thể rút 'Thẻ bài xanh lá' thay vì chọn tấn công."*
   - **`exp2_urban_legend`:** *"Hiệu ứng gây sát thương của thẻ bài đen 'Dùng một lần' sẽ hồi máu cho bạn thay vì mất máu. Bạn có thể tiết lộ bản thân khi hiệu ứng được giải quyết."*
   - **`exp2_cruz`:** *"Khi bạn rút thẻ bài đen, bạn có thể chọn đặt nó tại cuối chồng bài và rút 1 thẻ khác để thay thế."* | **Thắng:** *"Hạ gục một nhân vật khi dùng hoặc sau khi dùng các lá bài 'Bloodthirsty Spider', 'Dynamite', 'Spiritual Doll' hoặc 'Vampire Bat' trong cùng lượt."*
   - **`exp2_arlene`:** *"Bạn có thể phản ứng lại thẻ bài xanh lá như là một Shadow. Bạn không phải lộ diện bản thân để làm điều này."* | **Thắng:** *"Bạn bị hạ gục bởi một nhân vật Hunter."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Felicia:** Áp dụng cho **tất cả 3 chồng bài** (Xanh/Trắng/Đen) hay chỉ Trắng/Đen? Từ *"hủy"* là đưa vào **discard pile** hay xóa khỏi trận? Có áp dụng khi rút bài bằng kỹ năng/thẻ khác không?
   - **Eleanor:** Có thể kích hoạt khi **không có mục tiêu nào trong tầm tấn công** không? Nếu đang mang `ev_masamune` (`ev-01`) (bắt buộc tấn công), kỹ năng có được ưu tiên thay thế không?
   - **Urban Legend:** Áp dụng cho mọi thẻ Sự kiện Đen gây sát thương (kể cả khi **người chơi khác** rút thẻ Đen nhắm vào Urban Legend, ví dụ `Vampire Bat`, `Spider`, `Dynamite`) hay chỉ khi Urban Legend tự rút? Nếu thẻ có cả sát thương lẫn hiệu ứng phụ (ví dụ `Vampire Bat` gây 2 sát thương và hồi 1 máu cho người rút), người rút có vẫn được hồi 1 máu không?
   - **Cruz:** *"chọn đặt nó tại cuối chồng bài và rút 1 thẻ khác"* chỉ được thực hiện **1 lần cho mỗi lần rút bài Đen** (tránh vòng lặp vô hạn lọc cả chồng bài Đen!) hay không giới hạn? Cần ánh xạ chính thức 4 lá Đen sang `cards.ts`.
   - **Arlene:** Điều kiện *"bị hạ gục bởi một nhân vật Hunter"* có tính trường hợp Hunter giết bằng thẻ Đen/Trắng/Kỹ năng không? Và Arlene có **thắng ngay lập tức** (solo trigger kết thúc trận ngay khi bị Hunter giết) hay chỉ được ghi nhận là đồng thắng khi trận kết thúc (giống `Daniel`)?
3. **Ảnh hưởng đến engine hiện tại:**
   - `effects.ts` hiện rút trực tiếp 1 lá từ đầu deck và giải quyết tức thì (`resolveLocationEffect`); chưa có trạng thái `pendingCardChoice` (`choose_1_of_2` cho `Felicia`, `keep_or_bottom_redraw` cho `Cruz`).
   - `resolveInvestigateCard` hiện chỉ hardcode ngoại lệ duy nhất cho `Unknown` (`roleId === 'suong-tin-gia'`); cần tổng quát hóa thành `ON_INVESTIGATE` hook cho `Arlene` (giả làm Shadow, không chọn tùy ý như Unknown).
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** `Felicia` áp dụng cho cả 3 chồng bài, lá không chọn đưa về `discard`; `Cruz` giới hạn tối đa 1 lần đổi/lần rút bài Đen; `Eleanor` dùng được ngay cả khi không có mục tiêu nhưng bị `ev_masamune` (`ev-01`) ghi đè; `Urban Legend` kích hoạt với mọi thẻ Đen dùng 1 lần bất kể ai rút; `Arlene` thắng ngay khi bị Hunter kết liễu (hoặc đồng thắng cuối trận như `Daniel`).
   - **Phương án B:** `Felicia` chỉ áp dụng cho Trắng và Đen; `Arlene` chỉ thắng nếu chết bởi đòn tấn công trực tiếp của Hunter.
5. **Trạng thái:** **`UNRESOLVED`**

---

### RC-20: Điều kiện thắng phụ thuộc/sao chép/chuyển sát thương
- **Nhân vật liên quan:** `exp1_anathema`, `exp1_bethany`, `exp1_cassie`, `exp1_clairvoyant`

1. **Mô tả theo nguồn:**
   - **`exp1_anathema`:** *"Vào đầu lượt của bạn, bạn có thể lộ diện và chọn một người khác để nhận sát thương thay cho mình đến hết trò chơi. (Chỉ sử dụng 1 lần). Khi bạn lộ diện, nhận 1 sát thương vào cuối lượt đó."* | **Thắng:** *"Bạn không chết khi trò chơi kết thúc."*
   - **`exp1_bethany`:** *"Bắt đầu lượt của bạn, bạn có thể chọn Người được chọn bằng cách cho họ 1 Trang bị. Tất cả mọi người có thể cho bạn 1 Trang bị để trở thành Người được chọn. Chỉ có 1 người được chọn tại thời điểm đó."* | **Thắng:** *"Người được chọn thắng."*
   - **`exp1_cassie`:** *"Bắt đầu lượt của bạn, hồi 1 máu cho 1 người bất kỳ."* | **Thắng:** *"Giống với Neutral lộ diện trước."*
   - **`exp1_clairvoyant`:** *"Vào đầu lượt, bạn có thể chọn một người chưa lộ diện để xem thẻ nhân vật của họ, sau đó bạn sẽ có điều kiện thắng giống họ. (Chỉ sử dụng 1 lần)."* | **Thắng:** *"Sau khi kỹ năng kích hoạt thì mới có điều kiện thắng."*
2. **Điểm chưa rõ hoặc mâu thuẫn:**
   - **Anathema:** Lượng `1 sát thương vào cuối lượt lộ diện` áp lên **bản thân Anathema** hay bị chuyển sang nạn nhân đang bị nguyền? Khi nạn nhân bị nguyền **đã chết**, sát thương lên Anathema có quay trở lại đánh vào Anathema không? Nếu nạn nhân đang nguyền là `Arnold` (phản sát thương) thì có tạo vòng lặp chuyển sát thương không?
   - **Bethany:** Người chơi khác có thể tặng trang bị cho Bethany vào **thời điểm nào** (trong lượt của họ, có cần ở cùng khu vực không, có được tặng `ev_masamune` (`ev-01`) không)? Nếu hết trận mà **chưa có ai là Người được chọn** thì Bethany có điều kiện thắng dự phòng không (hay mặc định thua)? Nếu Người được chọn lại là một nhân vật phụ thuộc ngược về Bethany (ví dụ `Diana` chọn `Bethany`), vòng lặp kiểm tra thắng xử lý thế nào?
   - **Cassie:** *"Neutral lộ diện trước"* là Neutral khác đầu tiên lộ diện **trước khi Cassie lộ diện** hay **Neutral khác đầu tiên lộ diện trong cả ván đấu**? Nếu **không có Neutral nào khác** (ván 5 người) hoặc chưa có Neutral nào lộ diện khi hết trận thì Cassie xử lý thế nào?
   - **Clairvoyant:** Khi xem bí mật thẻ của 1 người chưa lộ diện, Clairvoyant có cần lộ diện bản thân không? Nếu **tất cả mọi người đều đã lộ diện** trước khi Clairvoyant kịp dùng kỹ năng thì sao? Nếu người bị xem là `Daniel` (đã chết đầu tiên — không thể) hoặc `Antimony`/`Clairvoyant` chưa có điều kiện thắng thì sao?
3. **Ảnh hưởng đến engine hiện tại:**
   - Toàn bộ 4 nhân vật đặt ra yêu cầu **Chống vòng lặp đệ quy** ở cả 2 lớp:
     1. **Skill Engine** (chuyển sát thương `Anathema` <-> `Arnold` / `Cindy`) — cần `maxRecursionDepth` và `visitedRedirectChain`.
     2. **Victory Engine** (`Bethany` <-> `Diana` <-> `Cassie` <-> `Clairvoyant` tạo đồ thị phụ thuộc điều kiện thắng) — cần phát hiện chu trình (`cycle detection`) trong quá trình đánh giá `CopiedVictory` / `SharedVictory`.
4. **Các phương án diễn giải có thể cân nhắc:**
   - **Phương án A:** `Anathema` tự chịu 1 sát thương cuối lượt (không chuyển), lời nguyền chấm dứt khi nạn nhân chết; `Bethany` nhận tặng trang bị trong lượt của người tặng (không tặng Masamune, không cần cùng khu vực), thua nếu không có Người được chọn; `Cassie` sao chép Neutral khác lộ diện đầu tiên trong trận (thua hoặc cần rule phụ cho 5P); `Clairvoyant` phải lộ diện khi kích hoạt và xem vai qua `privateView` server-authoritative.
   - **Phương án B:** `Anathema` miễn sát thương vĩnh viễn kể cả khi nạn nhân chết; tặng trang bị cho `Bethany` yêu cầu ở cùng khu vực.
5. **Trạng thái:** **`UNRESOLVED`**
