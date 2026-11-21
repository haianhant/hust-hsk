# Bóng Đêm KTX — Phase 6 Remaining Risks, Source Ambiguities & Human Playtest Checklist

> Tài liệu ghi nhận trung thực các rủi ro tồn đọng (P0/P1/P2), giới hạn bảo mật kênh phụ thời gian, các điểm còn mơ hồ trong luật gốc (`RC-13`, `RC-14`, `RC-15`, `RC-16`, `RC-20`), và danh sách hạng mục cần đánh giá qua **Human Playtest** trước khi kích hoạt rộng rãi.

---

## 1. Rủi ro Bảo mật & Riêng tư (Privacy & Security)

| Mức độ | Hạng mục | Hiện trạng sau Phase 6 | Khuyến nghị tiếp theo |
|---|---|---|---|
| **P0 (Đã vá trong 6D)** | Rò tên vai ẩn qua tiền tố `choiceId` (`choice-arnold-*`, `choice-usurper-*`, ...) trên `publicGame.pendingChoice` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** trong Phase 6D: toàn bộ 6 secret reactions (`Arnold`, `Usurper`, `Urban Legend`, `Undying`, `Cindy`, `Wendigo`) dùng tiền tố mờ `choice-secret-*` khi `isSecret === true`; kiểm chứng tự động trong `P6D-5`. | Duy trì assertion quét JSON toàn bộ `publicGame` trong CI. |
| **P1 (Residual Side-Channel)** | Kênh phụ thời gian mạng khi mở secret reaction (`arnold_reflect_lethal`, `cindy_reveal_retaliate`, `usurper_reveal_block_heal`, ...) | Payload JSON/log/VFX sạch 100% và `publicDeadlineMs` đã chuẩn hóa độc lập với trạng thái rớt mạng. Tuy nhiên bàn đấu vẫn tạm dừng khi chủ phản ứng chọn `ASK` thay vì giải quyết đòn đánh tức thì. | Tiếp tục khuyến khích `SET_REACTION_PREF`; cân nhắc tùy chọn "tốc độ phản hồi chuẩn hóa" ở chế độ giải đấu (tournament mode) nếu playtest thấy người chơi khai thác nhịp pause. |
| **P2 (UX / Social Meta)** | Rút gọn thời gian `publicDeadlineMs` khi nhiều phản ứng chuỗi chồng nhau | Hiện mỗi bước trong chuỗi `Anathema → Arnold → Cindy` hoặc `Gideon (3 lá Trắng)` mở 1 prompt độc lập có timeout riêng (`15s` mặc định). | Theo dõi cảm nhận nhịp độ (pacing) của người thật ở bàn 7P–8P khi nhiều phản ứng liên tiếp xảy ra. |

---

## 2. Các Điểm Mơ hồ Luật Gốc Được Giữ Nguyên Trạng thái `house-rule-approved`

Theo quy định nghiêm ngặt không tự biến house rule thành luật gốc (`verified`), toàn bộ 10 nhân vật Phase 6 giữ nguyên `rulesStatus: "house-rule-approved"` với các mốc `RC-*` còn mở để cộng đồng / playtest xem xét lại:

1. **`RC-13` — Diana (`exp2_diana`):** Mô tả kỹ năng gốc ghi *"first revealed Neutral"*, nhưng đoạn chiến lược gốc đôi lúc nhắc đến bóng/thợ săn. Phase 6 bám chặt văn bản kỹ năng (**chỉ Neutral khác lộ diện thường đầu tiên**), loại trừ chết/cuối trận, kích hoạt và ép Diana lộ diện ở đầu lượt kế tiếp của khách hàng; không có khách hàng dùng dự phòng đầy máu cuối trận.
2. **`RC-14` — Aaron (`exp2_aaron`):** Cách diễn đạt dịch tiếng Việt gốc *"bạn có thể không tấn công vợ"* vs quy tắc cấm tấn công vợ. Phase 6 áp dụng quy tắc cấm cứng: chặn tấn công trực tiếp, bỏ qua vợ khi dùng Machine Gun, và bảo vệ vợ ghi đè ép đánh của Masamune khi vợ là mục tiêu duy nhất trong cụm. Bảng giới tính vai diễn tách biệt 100% khỏi avatar người chơi (`character-metadata.ts`).
3. **`RC-15` — April & Skipps (`exp2_april_skipps`) & Dalton (`exp2_dalton`):** Quy ước rãnh vết thương (wound track):
   - *April & Skipps (8 HP):* áp dụng quy ước gốc vị trí 7 = đúng **7 vết thương (còn 1 HP)**, ép lộ diện và yêu cầu sống sót hết lượt kế tiếp của chính mình.
   - *Dalton (13 HP — từ Phase 5):* vẫn giữ quy ước thử nghiệm `<= 12` remaining HP để đối chiếu nhất quán; tiếp tục đánh dấu **ưu tiên cao trong Human Playtest** xem có cần chuyển về quy ước rãnh vết thương `12` vết (1 HP) hay không.
4. **`RC-16` — Gideon (`exp2_gideon`):** Catalog gốc quy định Gideon rút & giải quyết tuần tự 3 thẻ Cung Ứng (Trắng) sau khi một Shadow bị hạ gục (không phải chuyển hướng sát thương). Cần theo dõi Human Playtest xem chuỗi 3 lá Trắng ngoài lượt có tạo snowball trang bị quá mạnh hay không.
5. **`RC-20` — Copied Victory Graph (`Cassie`, `Clairvoyant`, `Bethany`, `Diana`):** Tách bạch rõ `COPY_GOAL` (đánh giá điều kiện thắng trên chính trạng thái bản thân) với `SHARE_OUTCOME` (đồng thắng theo kết quả của Chosen — Bethany vẫn đồng thắng kể cả khi đã chết) và `CONDITIONAL_SHARED` (Diana cần sống sót + khách hàng thắng). Chu trình phụ thuộc fail-closed (`won = false`).

---

## 3. Rủi ro Kiến trúc & Phạm vi Chuyển sang Phase 7 (8 Tướng Tier-4 Còn Lại)

8 nhân vật Tier-4 cuối cùng (`exp1_lloyd`, `exp1_vengeful_spirit`, `exp1_voodoo`, `exp1_undead`, `exp1_antimony`, `exp2_cain`, `exp2_bonnie`, `exp2_nc_soldier`) vẫn bị **khóa cứng (`not-started` / `needs-clarification`)** vì cần thêm các cơ chế nền tảng cấp cao ở Phase 7:
- **Turn Ownership Override** (`Voodoo`), **Pending Resurrection / Post-Death Revival** (`Undead`), **Dynamic Skill Copy** (`Vengeful Spirit`, `Antimony`), **Dynamic Allegiance / Faction Shift** (`Bonnie`, `N.C. Soldier`), **Multi-Faction Hybrid Victory** (`Cain`), và **Global Attack Interruption** (`Lloyd`).
- Các ruleset `expansion-1` (`21/26` xong), `expansion-2` (`27/30` xong) và `full-expansion` (`58/66` xong) tiếp tục bị khóa trên production cho tới khi hoàn tất Phase 7 và Human Beta Playtest.
