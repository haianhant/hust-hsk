# Bóng Đêm KTX — Phase 7 Release Readiness & Human Beta Playtest Plan

> **TRẠNG THÁI HUMAN BETA PLAYTEST:** **CHƯA THỰC HIỆN (`NOT YET EXECUTED` — `0 / 100` trận người thật ghi nhận).**  
> **TRẠNG THÁI PRODUCTION:** **GIỮ NGUYÊN `classic`-ONLY (`enabledInProduction = false` cho toàn bộ `starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion`).**  
> Báo cáo này trình bày kế hoạch **Human Beta Playtest** độc lập theo Section 30 làm điều kiện tiên quyết trước khi phê duyệt nâng bất kỳ gói mở rộng nào sang trạng thái `PUBLIC_RELEASE_APPROVED`.

---

## 1. Cổng Điều kiện Tiên quyết Đã Đạt (Technical Readiness — PASS)

- **66/66 nhân vật** đã triển khai server-authoritative và có **66/66 chân dung WebP gốc** kiểm duyệt thị giác.
- **30/30 kịch bản tương tác chéo Tier-4** + **E2E Cloudflare Durable Object thật 4P–8P** + **hibernation/reconnect** đều PASS.
- **30,000 trận mô phỏng deterministic (`starter-fifty-six`)**: `0` treo ván, `0` hòa, `0` rò rỉ payload riêng tư, `0` vi phạm bảo toàn trang bị.
- **0.00% hồi quy Classic**: `victory.ts` 0-diff, 25/25 SHA-256 RNG match, 4,500/4,500 trận Classic baseline trùng khớp tuyệt đối.

---

## 2. Kế hoạch Human Beta Playtest (Chưa Chạy — Bắt buộc Trước Mở Khóa Production)

### 2.1. Quy mô & Mục tiêu Tối thiểu

| Hạng mục | Chỉ tiêu Mục tiêu | Trạng thái Hiện tại |
|---|---|---|
| **Tổng số trận người thật hoàn tất** | **≥ 100 trận hoàn tất** (không tính trận bỏ giữa chừng) | `0 / 100` *(Chưa triển khai)* |
| **Phân bổ quy mô bàn** | Bao phủ đủ **4P, 5P, 6P, 7P, 8P** (tối thiểu `15` trận mỗi quy mô) | Chưa triển khai |
| **Môi trường chạy Beta** | Phòng kín/staging bật `ALLOW_EXPERIMENTAL_RULESETS=1` (hoặc danh sách phòng thử nghiệm được cấp phép), tách biệt hoàn toàn với người chơi `classic` phổ thông | Đã sẵn sàng hạ tầng cờ môi trường |
| **Tương tác phức tạp Tier-4 bắt buộc ghi nhận** | Phải quan sát trực tiếp trong thực tế người thật: Voodoo chiếm quyền (kèm tạm dừng lá Điều tra), Undead ngủ đông/hồi sinh 6 HP, Lloyd hủy đòn/Súng Máy, Vengeful Spirit & Antimony sao chép kỹ năng/mục tiêu, Bonnie đổi phe ở Shadow cuối, Cain thắng song phe, N.C. Soldier chiêu mộ & liên minh | Chưa triển khai |

### 2.2. Danh sách 8 Trọng tâm Theo dõi Bắt buộc (Section 30)

Ưu tiên gắn thẻ telemetry và phỏng vấn người chơi ngay sau trận với các nhân vật/tổ hợp sau:

1. **`Anathema`** *(bot-meta `81.08%` 🚨)*: Kiểm chứng xem người chơi thật có chủ động bắn xuyên Anathema để hạ đồng minh bị nguyền không; đặt ngưỡng cờ cân bằng nếu win rate người thật vượt `> 60%`.
2. **`Colt`** *(bot-meta `8.50%` 🚨)*: Kiểm chứng xem chiến thuật cướp đồ có chủ đích của người thật có kéo win rate Colt lên vùng `18–25%` hay cần cân nhắc mở rộng danh mục vũ khí ở bản cân bằng sau Beta.
3. **`Dalton`** *(câu hỏi mở `RC-15`)*: Ghi nhận cảm nhận người chơi về ngưỡng kích hoạt hiện hành (`<= 12` remaining HP) so với quy ước rãnh vết thương vật lý (`12` vết thương = `1 HP`).
4. **`G43 + Holy Robe`** *(bot-meta `73.64%` ⚠️)*: Đo tỷ lệ thắng thực tế khi có người thật biết cách đối phó bằng sát thương bài/kỹ năng xuyên giáp (`Wrath`, `Umibozu`, `Fallen`, `Vengeance`, cướp Áo Choàng tại `court`).
5. **`Voodoo`**: Đo độ rõ ràng UI khi màn hình chuyển sang trạng thái *"Đang bị Voodoo điều khiển"* và lúc tạm dừng cho nạn nhân tự xử lý lá Điều tra (`pausedForOwnerDecision`), kiểm tra có nhầm lẫn quyền hay phàn nàn về tốc độ lượt không.
6. **`Undead`** *(bot-meta `53.02%` ⚠️)*: Theo dõi tính rõ ràng của trạng thái `DORMANT_PENDING_REVIVE` (không thể nhắm mục tiêu, không kích hoạt loot/thắng sớm) và sức mạnh thực tế khi hồi sinh 6 HP.
7. **`Cain`**: Theo dõi phản ứng xã hội với kết thúc **`multi-faction`** (Hunter + Shadow đồng thắng khi Cain chết sau khi dùng kỹ năng) và độ khó mục tiêu thắng cá nhân 5P vs 6P–8P.
8. **`N.C. Soldier`** *(bot-meta `0.88%` 🚨)*: Đánh giá thực tế xem liên minh Neutral của người thật có thể trao đổi/phối hợp cướp đủ 3 vũ khí (`ev-06`, `ev-05`, `ev-03`) hay mục tiêu thắng quá bất khả thi trên bàn người thật.

### 2.3. Chỉ số Đo lường Bắt buộc Trong Human Beta

- **Thời lượng ván đấu & Độ trễ ra quyết định (`decision latency`):** Trung vị thời gian 1 trận (mục tiêu `<= 25 phút` ở 6P–8P) và thời gian trung bình xử lý mỗi `PendingChoice` (hiện ước tính `5.06 choices/trận`).
- **Độ rõ ràng mô tả kỹ năng (`ability clarity`):** Tỷ lệ người chơi hiểu đúng kỹ năng ngay lần đọc đầu (`>= 85%`) mà không cần hỏi trọng tài.
- **Nghi ngờ rò rỉ vai ẩn (`suspected hidden-role leaks`):** Ghi nhận mọi báo cáo nghi vấn suy luận vai từ độ trễ mạng (`choice-secret-*` timing side-channel) hoặc thông điệp log/VFX.
- **Chiến thắng bất ngờ (`unexpected wins`):** Kiểm tra từng trường hợp đồng thắng từ `CopiedVictoryGraph`, `multi-faction` (Cain) và `DynamicAllegiance` (Bonnie / N.C. Soldier) để đảm bảo màn hình `MatchResult` giải thích minh bạch *vì sao* từng người thắng.
- **Phản hồi người chơi định tính:** Khảo sát ngắn sau trận (1–5 điểm về độ vui, sự công bằng, rõ ràng UI).

---

## 3. Lộ trình Mở khóa Production Đề xuất Sau Phase 7 (Post-Phase-7 Release Plan)

Tuyệt đối **không** mở một lần toàn bộ 66 nhân vật ra production ngay lập tức. Khuyến nghị mở theo 4 chặng có cổng nghiệm thu riêng:

1. **Chặng 1 — Closed Human Beta (Nội bộ / Cộng đồng HUSTVerse · `starter-fifty-six`):** Chạy `>= 100` trận người thật 4P–8P, thu thập đầy đủ telemetry 8 trọng tâm trên, chốt xác minh các luật gốc còn mở (`RC-04` Vengeful Spirit, `RC-02` Undead 6 HP vs 6 vết thương, `RC-15` Dalton) và ban hành bản **Balance & UX Patch v1** (nếu dữ liệu người thật chứng minh cần chỉnh).
2. **Chặng 2 — Public Opt-In `expansion-1` (`10 Classic + 26 Exp1 = 36` tướng):** Sau khi đạt tiêu chí Human Beta, nâng `expansion-1` lên `PUBLIC_RELEASE_APPROVED` dưới dạng tùy chọn tạo phòng riêng (giữ `classic` làm mặc định). Theo dõi tỷ lệ bỏ ván, tốc độ lượt và tỷ lệ thắng trực tiếp 2 tuần.
3. **Chặng 3 — Public Opt-In `expansion-2` (`10 Classic + 30 Exp2 = 40` tướng):** Nâng `expansion-2` lên `PUBLIC_RELEASE_APPROVED` sau khi xác nhận `Cain`, `Bonnie`, `N.C. Soldier`, `G43`, `Colt`, `Dalton` ổn định trên người thật.
4. **Chặng 4 — Public Opt-In `full-expansion` (`66/66` tướng):** Mở chế độ tổng hợp 66 nhân vật cho phòng nâng cao, tiếp tục giữ `classic` không suy suyển như chế độ chuẩn cho người chơi mới.
