# Bóng Đêm KTX — Character Expansion Catalog (56 Tướng Mở Rộng + 10 Classic = 66)

> **Trạng thái Phase 2B (Internal Experimental Only):** Tài liệu này được đồng bộ từ [`character-catalog.json`](./character-catalog.json). Hiện có **8/56 tướng Starter Eight đã triển khai** trong pool thử nghiệm nội bộ (`starter-four` / `starter-eight`, tắt trên production); **48 tướng còn lại giữ nguyên `implementationStatus = not-started`** và production vẫn chỉ kích hoạt duy nhất **`classic` (10 tướng)**.
> **Kiểm tra dữ liệu:** Chạy `node scripts/validate-character-catalog.cjs`.

## 1. Tổng hợp Phân bổ & Nguồn Đối chiếu

| Bộ nhân vật | Hunter | Shadow | Neutral / Wanderer | Tổng | Trạng thái Production | Nguồn đối chiếu |
|---|---:|---:|---:|---:|---|---|
| **Classic (Baseline KTX)** | 3 | 3 | 4 | **10** | ✅ Active (`classic`) | `features/boardgame/domain/roles.ts` |
| **Expansion 1 (Shadow Hunters MR1)** | 8 | 9 | 9 | **26** | ⛔ Prod Disabled (5/26 `implemented` nội bộ) | 3 bài review `thegioiboardgame.vn` |
| **Expansion 2 (Shadow Hunters MR2)** | 9 | 9 | 12 | **30** | ⛔ Prod Disabled (3/30 `implemented` nội bộ) | 3 bài review `thegioiboardgame.vn` |
| **Tổng quy hoạch** | **20** | **21** | **25** | **66** | Classic only | — |

### 6 Liên kết Nguồn Chính (`https://thegioiboardgame.vn/`)

- **expansion-1-hunter:** https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-1-sha
- **expansion-1-neutral:** https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha
- **expansion-1-shadow:** https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh
- **expansion-2-hunter:** https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-hunter-cua-ban-mo-rong-thu-2-p
- **expansion-2-shadow:** https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-shadow-cua-ban-mo-rong-thu-2-p
- **expansion-2-neutral:** https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2

### Thống kê Trạng thái Luật (`rulesStatus`) & Triển khai (`implementationStatus`)

- **`verified` (`implemented` — Phase 2A):** 4 nhân vật (`exp1_wendigo`, `exp2_g43`, `exp2_fiona`, `exp2_wyvern`)
- **`house-rule-approved` (`implemented` — Phase 2B, HUSTVerse Experimental House Rules):** 4 nhân vật (`exp1_gayle`, `exp1_felicia`, `exp1_victor`, `exp1_undying`) — chi tiết quyết định tại [`phase-2/rules-decisions.md`](./phase-2/rules-decisions.md)
- **`needs-clarification` (`not-started`):** 48 nhân vật (tất cả đều có mục `UNRESOLVED` tương ứng trong [`rules-clarifications.md`](./rules-clarifications.md))
- **`unknown`:** 0 nhân vật

---

## 2. Danh sách chi tiết 56 Nhân vật Mở rộng

### 2.1. Expansion 1 — Phe Hunter (8 nhân vật)

> Nguồn bài viết: https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-1-sha

| # | ID | Tên gốc | HP | Kỹ năng | Trigger | Giới hạn | Lộ diện | Độ khó | Trạng thái luật |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `exp1_gayle` | **Gayle** | 14 | **Đấu sĩ thực tập**: Bạn có thể đổ lại xúc xắc đánh 1 lần nữa. Nếu làm vậy, bạn bắt buộc lấy kết quả thứ 2. | `BEFORE_ATTACK` | `per_attack` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 2 | `exp1_lloyd` | **Lloyd** | 12 | **Lạc lối**: Bạn có thể ngăn chặn cuộc tấn công xảy ra bất cứ lúc nào bằng cách cho bản thân mất 2 máu. | `REACTION_INTERRUPT` | `repeatable` | `needs-clarification` | `tier-4` (very-high) | `needs-clarification` |
| 3 | `exp1_felicia` | **Felicia** | 12 | **Tháo vát**: Mỗi lần lấy bài, lấy 2 lá, chọn 1 lá và lá còn lại hủy. | `ON_DRAW_CARD` | `passive` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 4 | `exp1_ernest` | **Ernest** | 10 | **Từ đạo**: Bạn có thể hy sinh 2 máu để tất cả các Shadow lộ diện và hủy tất cả trang bị của họ. (Chỉ sử dụng 1 lần). | `ACTIVE_SKILL` | `once_per_match` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 5 | `exp1_elysia` | **Elysia** | 10 | **Phản công**: Nếu bạn tấn công thành công gây sát thương nhỏ hơn 3, bạn có thể tăng thêm 2 sát thương. | `BEFORE_DAMAGE` | `per_attack` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 6 | `exp1_fallen` | **Fallen** | 12 | **Sự chống cự**: Bạn chỉ có thể lộ diện khi từ 8 máu trở lên. Miễn là bạn từ 8 máu trở lên khi tấn công thành công thì được tăng thêm 2 sát thương. | `BEFORE_DAMAGE` | `passive` | `must_be_revealed` | `tier-2` (medium) | `needs-clarification` |
| 7 | `exp1_gwendolen` | **Gwendolen** | 14 | **Sự che chở**: Bạn có thể tấn công lại cho những Hunter hoặc Neutral đã bị tấn công trong khu vực đó. | `AFTER_ATTACK` | `needs-clarification` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 8 | `exp1_fea` | **Fea** | 12 | **Chỉnh phục**: Bạn có thể tăng hoặc giảm 1 nút cho mỗi lần gieo xúc xắc di chuyển. | `ON_MOVE` | `per_turn` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |

### 2.2. Expansion 1 — Phe Shadow (9 nhân vật)

> Nguồn bài viết: https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-shadow-phien-ban-mo-rong-thu-1-phan-3-sh

| # | ID | Tên gốc | HP | Kỹ năng | Trigger | Giới hạn | Lộ diện | Độ khó | Trạng thái luật |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `exp1_vengeful_spirit` | **Vengeful Spirit** | 13 | **Quyền năng bất diệt**: Bạn có thể lộ diện ngay sau khi có 1 người chết. Sau đó, bạn có được kỹ năng của người đã chết cho đến hết trò chơi. (Chỉ sử dụng 1 lần) | `ON_ELIMINATION` | `once_per_match` | `reveal_on_trigger` | `tier-4` (very-high) | `needs-clarification` |
| 2 | `exp1_undying` | **Undying** | 11 | **Mạ Sắt**: Mỗi khi bạn nhận 2 hoặc nhiều sát thương, bạn có thể lộ diện (hoặc đã lộ diện) thì sát thương nhận được giảm đi 1. | `BEFORE_DAMAGE` | `passive` | `reveal_on_trigger` | `tier-2` (medium) | `needs-clarification` |
| 3 | `exp1_victor` | **Victor** | 13 | **Bác học điên**: Mỗi lần bạn tấn công thành công, bạn có thể nhận 1 sát thương để tăng thêm 2 sát thương cho cuộc tấn công của bạn. | `BEFORE_DAMAGE` | `per_attack` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 4 | `exp1_vengeance` | **Vengeance** | 13 | **Cái chết bất ngờ**: Sau khi bạn giết được bất kỳ người chơi khác, bạn có thể chọn 2 người chơi khác để nhận sát thương với xúc xắc 4 mặt. (Chỉ sử dụng 1 lần) | `ON_ELIMINATION` | `once_per_match` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 5 | `exp1_wendigo` | **Wendigo** | 14 | **Tiệc thịt**: Khi một người khác bị tiêu diệt, bạn có thể lộ diện (hoặc đã lộ diện) nhân vật để hồi 1 máu. | `ON_ELIMINATION` | `repeatable` | `reveal_on_trigger` | `tier-1` (low) | `verified` |
| 6 | `exp1_voodoo` | **Voodoo** | 13 | **Con rối**: Bắt đầu lượt của bạn, chọn 1 người chơi: Bạn cướp lượt chơi của người đó, nhưng bạn không thể xem và sử dụng chức năng nhân vật đó. (Chỉ sử dụng 1 lần) | `ON_TURN_START` | `once_per_match` | `needs-clarification` | `tier-4` (very-high) | `needs-clarification` |
| 7 | `exp1_udi` | **Udi** | 11 | **Ẩn thân**: Bạn không thể bị tấn công khi có 2 hoặc nhiều người chơi khác đang ở cùng khu vực với bạn. | `BEFORE_ATTACK` | `passive` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 8 | `exp1_wrath` | **Wrath** | 14 | **Bùng cháy**: Bắt đầu lượt của bạn, bạn có thể cho tất cả người chơi đang ở cùng khu vực của bạn nhận 2 sát thương. | `ON_TURN_START` | `per_turn` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 9 | `exp1_undead` | **Undead** | 11 | **Xác sống trỗi dậy**: Chỉ lộ diện khi bạn chết. Sau đó, vào đầu lượt tiếp theo mình, bạn sẽ hồi sinh với số máu là 6 và chơi tiếp lượt đó như bình thường. (Chỉ sử dụng 1 lần) | `ON_ELIMINATION` | `once_per_match` | `forced_reveal_on_condition` | `tier-4` (very-high) | `needs-clarification` |

#### Điều kiện thắng nguyên văn theo nguồn (Expansion 1 — Phe Shadow (9 nhân vật))

| ID | Tên gốc | Điều kiện thắng (nguồn) | Ghi chú kích hoạt |
|---|---|---|---|
| `exp1_vengeful_spirit` | **Vengeful Spirit** | Tiêu diệt tất cả các Hunter hoặc Neutral. | Ngay sau khi có 1 người chơi chết (bài nguồn mâu thuẫn giữa bất kỳ người chết nào hay chỉ người chết đầu tiên). |
| `exp1_undying` | **Undying** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Khi nhận >= 2 sát thương (chưa rõ áp dụng cho mọi nguồn sát thương hay chỉ đòn đánh và thứ tự cộng dồn với trang bị giảm sát thương). |
| `exp1_victor` | **Victor** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Khi tấn công thành công (chưa rõ khi còn 1 HP có tự sát được không và tương tác với đòn đánh diện rộng Machine Gun). |
| `exp1_vengeance` | **Vengeance** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Sau khi hạ gục một người chơi khác (chưa rõ đổ 1 hay 2 xúc xắc d4 và trường hợp chỉ còn 1 mục tiêu sống). |
| `exp1_wendigo` | **Wendigo** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Khi một người chơi khác bị tiêu diệt; Wendigo đã lộ diện hoặc chọn lộ diện ngay lúc đó. |
| `exp1_voodoo` | **Voodoo** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Vào đầu lượt của Voodoo (chưa rõ thực thi ngay lập tức hay đến lượt tiếp theo của mục tiêu, quyền di chuyển/dùng trang bị/bài và lượt riêng của Voodoo). |
| `exp1_udi` | **Udi** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Khi có >= 2 người chơi khác đang ở cùng 'khu vực' (chưa rõ tính 1 Location hay Cụm 2 Location và tương tác Machine Gun / phản công). |
| `exp1_wrath` | **Wrath** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Vào đầu lượt của Wrath (chưa rõ phạm vi 'cùng khu vực' là 1 Location hay Cụm 2 Location và có tính bản thân hay không). |
| `exp1_undead` | **Undead** | Tiêu diệt tất cả các Hunter hoặc 3 Neutral. | Chỉ được lộ diện khi chết lần đầu; hồi sinh ở đầu lượt tiếp theo (chưa rõ trạng thái loại khỏi trận, kiểm tra thắng nếu là Shadow cuối cùng, loot trang bị và mốc máu 6). |

### 2.3. Expansion 1 — Phe Neutral (9 nhân vật)

> Nguồn bài viết: https://thegioiboardgame.vn/blogs/review-boardgame/phan-tich-danh-gia-phe-hunter-phien-ban-mo-rong-thu-1-phan-2-sha

| # | ID | Tên gốc | HP | Kỹ năng | Trigger | Giới hạn | Lộ diện | Độ khó | Trạng thái luật |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `exp1_bipolar` | **Bipolar** | 10 | **Đồng xu định mệnh**: Bắt đầu lượt của bạn, bạn có thể chọn hồi máu hoặc nhận sát thương với xúc xắc 4 mặt cộng thêm 2 (từ 3 đến 6). (Chỉ sử dụng 1 lần) | `ON_TURN_START` | `once_per_match` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 2 | `exp1_anathema` | **Anathema** | 8 | **Lời nguyền**: Vào đầu lượt của bạn, bạn có thể lộ diện và chọn một người khác để nhận sát thương thay cho mình đến hết trò chơi. (Chỉ sử dụng 1 lần). Khi bạn lộ diện, nhận 1 sát thương vào cuối lượt đó. | `ON_TURN_START` | `once_per_match` | `reveal_to_activate` | `tier-3` (high) | `needs-clarification` |
| 3 | `exp1_bethany` | **Bethany** | 10 | **Thay đổi vận mệnh**: Bắt đầu lượt của bạn, bạn có thể chọn Người được chọn bằng cách cho họ 1 Trang bị. Tất cả mọi người có thể cho bạn 1 Trang bị để trở thành Người được chọn. Chỉ có 1 người được chọn tại thời điểm đó. | `ON_TURN_START` | `repeatable` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 4 | `exp1_cindy` | **Cindy** | 11 | **Con ác mộng**: Khi bạn nhận sát thương, bạn có thể tiết lộ nhân vật (hoặc đã lộ diện) gây lại người tấn công 1 sát thương. | `AFTER_DAMAGE` | `repeatable` | `reveal_on_trigger` | `tier-2` (medium) | `needs-clarification` |
| 5 | `exp1_arnold` | **Arnold** | 8 | **Số phận thay đổi**: Khi bạn nhận sát thương và chết, thay vào đó, bạn sẽ không chết và chuyển toàn bộ số sát thương kết liễu cho người đã gây cho bạn. (Chỉ sử dụng 1 lần). | `BEFORE_DAMAGE` | `once_per_match` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 6 | `exp1_antimony` | **Antimony** | 8 | **Nhân bản**: Khi có 1 người chơi khác chết, bạn lộ diện thân phận của mình. Bạn sao chép hết kỹ năng và điều kiện thắng của người chơi đó. (Chỉ sử dụng 1 lần). | `ON_ELIMINATION` | `once_per_match` | `forced_reveal_on_condition` | `tier-4` (very-high) | `needs-clarification` |
| 7 | `exp1_cassie` | **Cassie** | 11 | **Cuộc tình dị thường**: Bắt đầu lượt của bạn, hồi 1 máu cho 1 người bất kỳ. | `ON_TURN_START` | `per_turn` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 8 | `exp1_clairvoyant` | **Clairvoyant** | 11 | **Lời tiên tri**: Vào đầu lượt, bạn có thể chọn một người chưa lộ diện để xem thẻ nhân vật của họ, sau đó bạn sẽ có điều kiện thắng giống họ. (Chỉ sử dụng 1 lần). | `ON_TURN_START` | `once_per_match` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 9 | `exp1_angel` | **Angel** | 8 | **Thiên sứ bảo hộ**: Sau khi bắt đầu lượt tiếp theo của bạn, tất cả Neutral đã lộ diện không nhận bất kỳ sát thương nào. (Chỉ sử dụng 1 lần). | `ACTIVE_SKILL` | `once_per_match` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |

#### Điều kiện thắng nguyên văn theo nguồn (Expansion 1 — Phe Neutral (9 nhân vật))

| ID | Tên gốc | Điều kiện thắng (nguồn) | Ghi chú kích hoạt |
|---|---|---|---|
| `exp1_bipolar` | **Bipolar** | Còn sống khi phe Hunter thắng. Hoặc chết khi phe Shadow thắng. | Vào đầu lượt của Bipolar (phần Ưu điểm bài nguồn mâu thuẫn ghi 'gây sát thương' thay vì 'nhận sát thương', và mục tổng kết cuối bài ghi sai điều kiện thắng). |
| `exp1_anathema` | **Anathema** | Bạn không chết khi trò chơi kết thúc. | Vào đầu lượt của Anathema (chưa rõ sát thương cuối lượt có bị chuyển sang nạn nhân không, và xử lý khi nạn nhân chết hoặc bị sát thương quá mức). |
| `exp1_bethany` | **Bethany** | Người được chọn thắng. | Đầu lượt Bethany hoặc trong lượt người chơi khác muốn tặng trang bị (chưa rõ thời điểm người khác tặng trang bị, quy tắc Masamune và khi không có Người được chọn cuối trận). |
| `exp1_cindy` | **Cindy** | Tất cả Neutral chết và bạn còn sống. | Khi Cindy nhận sát thương (chưa rõ áp dụng cho mọi nguồn sát thương hay chỉ tấn công, và điều kiện thắng khi là Neutral duy nhất trong ván 5 người). |
| `exp1_arnold` | **Arnold** | Bạn còn sống và trên bàn chơi có nhiều hơn 2 người khi trò chơi kết thúc. | Khi nhận sát thương chí mạng (chưa rõ xử lý sát thương không có nguồn người chơi như Dynamite/tự sát, và trạng thái HP của Arnold sau khi phản sát thương). |
| `exp1_antimony` | **Antimony** | Sau khi kỹ năng kích hoạt thì mới có điều kiện thắng. | Khi có 1 người chơi khác chết (chưa rõ bắt buộc ở người chết đầu tiên hay được chọn, có đổi phe thực sự hay chỉ chép điều kiện thắng, và sao chép kỹ năng 1 lần đã dùng). |
| `exp1_cassie` | **Cassie** | Giống với Neutral lộ diện trước. | Vào đầu lượt của Cassie (chưa rõ điều kiện thắng khi không có Neutral nào khác lộ diện trước hoặc trong ván 5 người chỉ có 1 Neutral). |
| `exp1_clairvoyant` | **Clairvoyant** | Sau khi kỹ năng kích hoạt thì mới có điều kiện thắng. | Đầu lượt, chọn 1 người chơi chưa lộ diện (chưa rõ có cần Clairvoyant lộ diện không, điều kiện thắng nếu mục tiêu là Daniel/Neutral chết sớm hoặc toàn bàn đã lộ diện). |
| `exp1_angel` | **Angel** | Tất cả Neutral còn sống hoặc bạn đứng khu vực "Church" (Số 6) khi trò chơi kết thúc. | Chưa rõ thời hạn miễn sát thương ('sau khi bắt đầu lượt tiếp theo' kéo dài đến lúc nào) và ánh xạ địa điểm 'Church (Số 6)' sang bản đồ KTX. |

### 2.4. Expansion 2 — Phe Hunter (9 nhân vật)

> Nguồn bài viết: https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-hunter-cua-ban-mo-rong-thu-2-p

| # | ID | Tên gốc | HP | Kỹ năng | Trigger | Giới hạn | Lộ diện | Độ khó | Trạng thái luật |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `exp2_father_harrison` | **Father Harrison** | 12 | **Lễ Ngày Chủ Nhật**: Khi di chuyển, bạn có thể chọn di chuyển vào "Church" (Nhà thờ) thay cho đổ xí ngầu. | `ON_MOVE` | `per_turn` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 2 | `exp2_gloria` | **Gloria** | 14 | **Phước Lành Mạnh Mẽ**: Lấy 2 thẻ trắng thay vì 1 khi đi vào khu vực "Church" (Nhà thờ). | `ON_DRAW_CARD` | `passive` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 3 | `exp2_fujiko` | **Fujiko** | 12 | **Kết Thúc Rồi**: Đòn tấn công thành công của bạn sẽ ngay lập tức hạ gục 1 nhân vật đã lộ diện chỉ còn 4 máu. | `AFTER_ATTACK` | `passive` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 4 | `exp2_freyja` | **Freyja** | 12 | **Tấn Công Liều Lĩnh**: Sau khi tấn công, bạn có thể bỏ thẻ bài trang bị bị tấn công thêm 1 lần nữa, số lần tấn công tương ứng với số trang bị mà bạn bỏ. | `AFTER_ATTACK` | `per_turn` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 5 | `exp2_gideon` | **Gideon** | 14 | **Phần Thưởng Nhiệm Vụ**: Bạn có thể lập tức rút và dùng 3 “Thẻ bài trắng” sau khi một Shadow bị hạ gục. | `ON_ELIMINATION` | `needs-clarification` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 6 | `exp2_g43` | **G43** | 14 | **Chế Độ Pháo Đài**: Khi nhân vật này đã lộ diện, nhân vật này nhận ít đi 2 sát thương từ đòn tấn công. | `BEFORE_DAMAGE` | `passive` | `must_be_revealed` | `tier-1` (low) | `verified` |
| 7 | `exp2_eleanor` | **Eleanor** | 10 | **Người Thẩm Vấn**: Trong giai đoạn tấn công, bạn có thể rút "Thẻ bài xanh lá" thay vì chọn tấn công. | `ACTIVE_SKILL` | `per_turn` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 8 | `exp2_elise` | **Elise** | 10 | **Âm Hưởng Mềm Mại**: Phân phát 5 máu cho tất cả các nhân vật ở cùng khu vực với bạn, bao gồm cả bản thân. (Chỉ sử dụng 1 lần) | `ACTIVE_SKILL` | `once_per_match` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 9 | `exp2_fiona` | **Fiona** | 12 | **Đòn Đánh Giải Phẫu**: Khi tấn công, bạn đổ xí ngầu 2 lần và giữ một trong hai kết quả để áp dụng. | `BEFORE_ATTACK` | `per_attack` | `must_be_revealed` | `tier-1` (low) | `verified` |

### 2.5. Expansion 2 — Phe Shadow (9 nhân vật)

> Nguồn bài viết: https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-shadow-cua-ban-mo-rong-thu-2-p

| # | ID | Tên gốc | HP | Kỹ năng | Trigger | Giới hạn | Lộ diện | Độ khó | Trạng thái luật |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `exp2_warlock` | **Warlock** | 14 | **Nguồn Lực**: Đòn tấn công thành công của bạn sẽ gây thêm 3 sát thương nếu bạn đang đứng ở "Erstwhile Altar". | `BEFORE_DAMAGE` | `passive` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 2 | `exp2_witch` | **Witch** | 14 | **Không nơi đâu bằng nhà**: Bạn không nhận sát thương khi đang ở trong “Weird Woods”. | `BEFORE_DAMAGE` | `passive` | `needs-clarification` | `tier-1` (low) | `needs-clarification` |
| 3 | `exp2_wyvern` | **Wyvern** | 14 | **Hấp thụ**: Hồi 5 máu khi giết một Hunter hoặc Neutral bằng đòn tấn công. Hồi đầy máu nếu giết một Shadow. | `ON_ELIMINATION` | `repeatable` | `must_be_revealed` | `tier-1` (low) | `verified` |
| 4 | `exp2_umibozu` | **Umibozu** | 11 | **(Lật úp)**: Khi nhân vật này đã lộ diện, tự nguyện hoặc bị ép, gây 3 sát thương cho toàn bộ nhân vật ở cùng khu vực với bạn. (Chỉ sử dụng 1 lần). | `ON_ROLE_REVEAL` | `once_per_match` | `reveal_on_trigger` | `tier-2` (medium) | `needs-clarification` |
| 5 | `exp2_urban_legend` | **Urban Legend** | 11 | **Chào mừng rắc rối**: Hiệu ứng gây sát thương của thẻ bài đen “Dùng một lần” sẽ hồi máu cho bạn thay vì mất máu. Bạn có thể tiết lộ bản thân khi hiệu ứng được giải quyết. | `BEFORE_DAMAGE` | `passive` | `reveal_on_trigger` | `tier-2` (medium) | `needs-clarification` |
| 6 | `exp2_visions` | **Visions** | 13 | **Điềm báo**: Chọn một nhân vật vào đầu lượt của bạn. Bạn không thể tấn công nhân vật này nữa, và suốt phần còn lại của trò chơi, nhân vật bạn chọn sẽ mất 1 máu vào đầu lượt của bạn. (Chỉ sử dụng 1 lần). | `ON_TURN_START` | `once_per_match` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 7 | `exp2_unchained` | **Unchained** | 11 | **Bạo lực vô tận**: Khi nhân vật này đã lộ diện, bạn gây thêm 2 sát thương khi tấn công. | `BEFORE_DAMAGE` | `passive` | `must_be_revealed` | `tier-1` (low) | `needs-clarification` |
| 8 | `exp2_warlord` | **Warlord** | 14 | **Đột kích**: Trong giai đoạn di chuyển, bạn có thể chọn một người chơi để kéo người đó tới cùng khu vực với bạn và ngay lập tức tấn công người đó như một hành động thêm trong lượt, sau đó bạn chơi như bình thường. (Chỉ sử dụng 1 lần). | `ON_MOVE` | `once_per_match` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 9 | `exp2_usurper` | **Usurper** | 11 | **Bạo lực vô tận**: Khi bạn lộ diện nhân vật mình, thì những nhân vật khác không thể dùng “Kỹ năng” hoặc “Lá bài Trắng” để hồi máu. Bạn cũng có thể chọn lộ diện bản thân ở một lượt bất kỳ để chặn một lần hồi máu. | `ON_HEAL` | `passive` | `reveal_on_trigger` | `tier-3` (high) | `needs-clarification` |

### 2.6. Expansion 2 — Phe Neutral (12 nhân vật)

> Nguồn bài viết: https://thegioiboardgame.vn/blogs/review-boardgame/bai-phan-tich-va-danh-gia-nhan-vat-phe-neutral-cua-ban-mo-rong-thu-2

| # | ID | Tên gốc | HP | Kỹ năng | Trigger | Giới hạn | Lộ diện | Độ khó | Trạng thái luật |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `exp2_cain` | **Cain** | 11 | **Nước Cờ Quyền Lực**: Bạn hồi số lượng máu bằng với tổng số người đang chơi. Và hai phe Hunter và Shadow được thêm 1 điều kiện thắng là "Khi Cain chết". (dùng 1 lần trong trò chơi) | `ACTIVE_SKILL` | `once_per_match` | `needs-clarification` | `tier-4` (very-high) | `needs-clarification` |
| 2 | `exp2_dalton` | **Dalton** | 13 | **Vòng Đấu Thứ 12**: Lộ diện nhân vật của bạn khi chạm mức 12 máu. Từ thời điểm đó, bạn không thể tự hồi máu cho bản thân mình. | `AFTER_DAMAGE` | `once_per_match` | `forced_reveal_on_condition` | `tier-3` (high) | `needs-clarification` |
| 3 | `exp2_april_skipps` | **April & Skipps** | 8 | **Bị Phát Hiện!! Chạy Ngay!**: Bạn phải lộ diện khi máu mình đang ở ô số 7. | `AFTER_DAMAGE` | `once_per_match` | `forced_reveal_on_condition` | `tier-3` (high) | `needs-clarification` |
| 4 | `exp2_bonnie` | **Bonnie** | 10 | **Nghi Thức Kế Thừa**: Khi giết chết một Shadow, bạn sẽ trở thành một Shadow và trở thành đồng đội của các Shadow khác. | `ON_ELIMINATION` | `once_per_match` | `needs-clarification` | `tier-4` (very-high) | `needs-clarification` |
| 5 | `exp2_bianca` | **Bianca** | 10 | **Mọi Thứ Phế Liệu**: Bạn có thể bỏ một trang bị để vô hiệu sát thương từ một nguồn sát thương đơn mục tiêu. | `REACTION_INTERRUPT` | `repeatable` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 6 | `exp2_colt` | **Colt** | 11 | **Công Lý Đường Phố**: Bạn có thể ngay lập tức tấn công bất cứ nhân vật nào đang cướp trang bị từ bạn. Nếu bạn gây được 2 thiệt hại trở lên bằng cách này, bạn có thể chọn lấy lại vật phẩm đó thay vì gây sát thương. | `ON_EQUIPMENT_CHANGE` | `repeatable` | `needs-clarification` | `tier-3` (high) | `needs-clarification` |
| 7 | `exp2_cruz` | **Cruz** | 11 | **Phá Hủy Có Chọn Lọc**: Khi bạn rút thẻ bài đen, bạn có thể chọn đặt nó tại cuối chồng bài và rút 1 thẻ khác để thay thế. | `ON_DRAW_CARD` | `repeatable` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 8 | `exp2_diana` | **Diana** | 13 | **Cho Thuê**: Neutral đầu tiên lộ diện sẽ trở thành khách hàng của bạn, bắt đầu từ lượt tiếp theo của họ và bạn sẽ lộ diện khi điều đó xảy ra. | `ON_ROLE_REVEAL` | `once_per_match` | `forced_reveal_on_condition` | `tier-3` (high) | `needs-clarification` |
| 9 | `exp2_aaron` | **Aaron** | 8 | **Yêu Từ Cái Nhìn Đầu Tiên**: Nhân vật nữ đầu tiên lộ diện sẽ trở thành vợ của bạn. Lộ diện bản thân, và kể thời điểm đó trở đi, bạn có thể không tấn công vợ mình. | `ON_ROLE_REVEAL` | `once_per_match` | `forced_reveal_on_condition` | `tier-3` (high) | `needs-clarification` |
| 10 | `exp2_arlene` | **Arlene** | 8 | **Điệu Bộ**: Bạn có thể phản ứng lại thẻ bài xanh lá như là một Shadow. Bạn không phải lộ diện bản thân để làm điều này. | `ON_INVESTIGATE` | `passive` | `hidden_allowed` | `tier-2` (medium) | `needs-clarification` |
| 11 | `exp2_bryon` | **Bryon** | 10 | **Sự Phục Vụ Hào Phóng**: Trước khi bạn tấn công, bạn có thể tự do trao tặng bất kỳ số lượng trang bị của bản thân mình cho nhân vật Neutral đã lộ diện ở cùng khu vực với mình. Ngoại trừ “Masamune”. | `BEFORE_ATTACK` | `per_turn` | `needs-clarification` | `tier-2` (medium) | `needs-clarification` |
| 12 | `exp2_nc_soldier` | **N.C. Soldier** | 13 | **Chiêu Mộ**: Như một đòn tấn công trực tiếp, bạn có thể sử dụng kỹ năng "Chiêu Mộ" thay cho một đòn tấn công thông thường lên một nhân vật Neutral. Nếu nhân vật đó chịu ít nhất 5 sát thương, nhân vật Neutral đó sẽ thay đổi điều kiện chiến thắng và Kỹ năng Đặc biệt để giống với bạn, sau đó họ sẽ chiến đấu về phe bạn. | `ACTIVE_SKILL` | `per_turn` | `needs-clarification` | `tier-4` (very-high) | `needs-clarification` |

#### Điều kiện thắng nguyên văn theo nguồn (Expansion 2 — Phe Neutral (12 nhân vật))

| ID | Tên gốc | Điều kiện thắng (nguồn) | Ghi chú kích hoạt |
|---|---|---|---|
| `exp2_cain` | **Cain** | Một Hunter, một Shadow và một Neutral khác ngoài bạn đã chết. Trong một ván chơi 5 người, giết một Hunter và một Shadow. | Chưa rõ 'tổng số người đang chơi' là số người ban đầu hay còn sống, điều kiện thắng 5P ('giết') vs 6-8P ('đã chết'), và phân xử thắng khi Cain chết làm thỏa cả Hunter và Shadow. |
| `exp2_dalton` | **Dalton** | Hạ gục một nhân vật sau khi kích hoạt kỹ năng "Vòng đấu thứ 12". Mặt khác, phải là người còn nhiều máu nhất khi trò chơi kết thúc. | Chạm mức '12 máu' (chưa rõ là còn 12 HP / mất 1 HP hay nhận 12 sát thương / còn 1 HP; đồng thời chưa rõ xử lý hòa khi nhiều người cùng nhiều máu nhất cuối trận). |
| `exp2_april_skipps` | **April & Skipps** | Không lộ diện nhân vật khi trò chơi kết thúc. Nếu nhân vật bị lộ diện do kỹ năng của mình, thì bạn hãy cố gắng sống sót đến cuối lượt tiếp theo của mình, nếu làm được điều đó bạn sẽ chiến thắng. | Khi máu ở 'ô số 7' (chưa rõ là 7 vết thương / còn 1 HP hay còn 7 HP, và xử lý trường hợp nhảy thẳng từ 6 sang >= 8 sát thương hoặc chết trước khi chạm ô 7). |
| `exp2_bonnie` | **Bonnie** | Chiến thắng khi trở thành một phần của phe Shadow sau khi giành được vị trí từ một trong số chúng. | Khi hạ gục một Shadow (chưa rõ thứ tự với kiểm tra thắng phe Hunter nếu đó là Shadow cuối cùng, cách cập nhật phe cho thẻ Điều tra, và nguồn sát thương ngoài đòn đánh). |
| `exp2_bianca` | **Bianca** | Bạn có lượng máu còn lại thấp nhất trong tất cả các nhân vật còn sống khi trò chơi kết thúc. | Khi nhận sát thương đơn mục tiêu (cần cửa sổ phản ứng ngoài lượt, làm rõ có được bỏ Masamune không và hòa lượng máu thấp nhất cuối trận). |
| `exp2_colt` | **Colt** | Sở hữu từ 3 trang bị trở lên có tên: "Butcher Knife", "Chainsaw", "Handgun", hoặc "Rusted Broad Axe". | Khi một người chơi khác cướp trang bị của Colt (cần phản ứng ngoài lượt, xác minh tầm đánh khi cướp từ xa như thẻ bài, và ánh xạ tên 4 vũ khí SH sang bộ trang bị KTX). |
| `exp2_cruz` | **Cruz** | Hạ gục một nhân vật khi dùng hoặc sau khi dùng các lá bài "Bloodthirsty Spider", "Dynamite", "Spiritual Doll" hoặc "Vampire Bat" trong cùng lượt. | Khi rút thẻ bài Đen (chưa rõ có giới hạn 1 lần/lần rút không và cần ánh xạ chính thức 4 lá bài Đen SH sang `ev-01..ev-13` của KTX). |
| `exp2_diana` | **Diana** | Điều kiện chiến thắng của bạn dựa trên khách hàng của bạn khi bạn còn sống. Nếu bạn không tìm thấy khách hàng của mình, thì bạn phải đầy máu khi trò chơi kết thúc. | Mâu thuẫn nội bộ bài nguồn: mô tả kỹ năng ghi 'Neutral đầu tiên lộ diện', còn phần Chiến thuật chơi ghi khách hàng có thể là 'Shadow hoặc Hunter'; đồng thời cần xử lý ván 5 người không có Neutral khác. |
| `exp2_aaron` | **Aaron** | Bạn và người vợ của bạn còn sống khi trò chơi kết thúc. Nếu bạn không tìm thấy vợ của mình, chết trước khi trò chơi kết thúc. | Cần thuộc tính giới tính (`gender`) chuẩn cho toàn bộ 66 nhân vật (Classic + Mở rộng) và làm rõ câu 'có thể không tấn công' vs 'không thể tấn công' (kể cả khi mang Masamune/Machine Gun). |
| `exp2_arlene` | **Arlene** | Bạn bị hạ gục bởi một nhân vật Hunter. | Khi nhận thẻ Xanh Lá (Investigation) — chưa rõ 'bị hạ gục bởi Hunter' có tính thẻ Sự kiện/Kỹ năng của Hunter không và liệu có thắng ngay lập tức hay cuối trận. |
| `exp2_bryon` | **Bryon** | Không có Neutral nào chết khi trò chơi kết thúc. | Trước bước tấn công (chưa rõ phạm vi 'cùng khu vực', có được tặng khi không tấn công không, và xử lý khi là Neutral duy nhất trong ván 5 người). |
| `exp2_nc_soldier` | **N.C. Soldier** | Chiêu mộ tất cả các nhân vật Neutral khác trong lúc chơi và thu thập đủ các lá bài "Machine gun", "Handgun", và "Chainsaws". | Thay cho đòn tấn công lên một Neutral (chưa rõ mục tiêu ẩn vai, ngưỡng '>= 5 sát thương' là cộng dồn hay 1 đòn, ván 5P không có Neutral khác, và sở hữu chung hay riêng 3 vũ khí). |

