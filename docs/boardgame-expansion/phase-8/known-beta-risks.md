# Bóng Đêm KTX — Known Production Beta Risks & Limitations

> Tài liệu công khai, trung thực các rủi ro đã biết trong giai đoạn **Production Beta / Early Access** (Phase 8A) nhằm giúp đội ngũ vận hành theo dõi sát và ưu tiên sửa đổi qua dữ liệu người thật.

---

## 1. Trạng thái Kiểm thử Người thật (Human Beta)

- **Chưa hoàn tất mốc 100 trận người thật:** Tính tại thời điểm mở Production Beta, số trận hoàn tất từ người chơi thật là **`0 / 100`**. Đây là đợt thu thập dữ liệu người thật thông qua **Production Early Access** có nhãn **Beta** rõ ràng — **không** phải trạng thái `PUBLIC_RELEASE_APPROVED`.

---

## 2. Rủi ro Cân bằng Đã Quan sát Từ Mô phỏng 30,000 Trận Bot

Dữ liệu mô phỏng bot Phase 7E ([`phase-7e-simulation-report.md`](../phase-7/phase-7e-simulation-report.md)) ghi nhận các ngoại lệ rõ rệt cần theo dõi ưu tiên trong Production Beta (chưa tự ý buff/nerf trước khi có dữ liệu người thật):
- **Tỷ lệ thắng cao ở bot-meta:** `Anathema` (`81.08%`), `G43 + Holy Robe` (`73.64%`), `Cindy 5P` (`69.44%`), `Angel 5P` (`69.69%`), `Wrath` (`57.81%`), `Bethany` (`56.56%`), `Undead` (`53.02%`).
- **Tỷ lệ thắng thấp ở bot-meta:** `N.C. Soldier` (`0.88%`), `Colt` (`8.50%`), `Bonnie` (`9.80%`), `Antimony` (`16.32%`), `Diana` (`18.94%`), `Cain` cá nhân (`24.00%`).
- **Nhịp độ lựa chọn ngoài lượt (`PendingChoice`):** Trung bình `5.06` choices/trận trên Full 66 (đặc biệt khi `Lloyd` có mặt). Cần theo dõi thời lượng ván trung bình (`avgMatchDurationMs`) và tỷ lệ `pendingChoiceTimeouts` trong telemetry thực tế.

---

## 3. Rủi ro Bảo mật Kênh phụ Thời gian Tồn dư (Residual Timing Side-Channels)

Kế thừa đánh giá trung thực từ [`phase-7/security-and-privacy-audit.md`](../phase-7/security-and-privacy-audit.md):
- Toàn bộ payload JSON/WebSocket/DOM/Telemetry đã được bảo chứng sạch 100% (0 rò rỉ vai ẩn, 0 rò rỉ token, tiền tố mờ `choice-secret-*`, chuẩn hóa `publicDeadlineMs`).
- **Tồn dư:** Khi một người chơi sở hữu vai phản ứng kín (`Vengeful Spirit`, `Undying`, `Arnold`, `Cindy`, `Usurper`, `Wendigo`, `Bianca`) để chế độ `ASK` và cân nhắc vài giây, nhịp tạm dừng của bàn vẫn có thể tạo tín hiệu thời gian cho người chơi kinh nghiệm. Tương tự, `pausedForOwnerDecision: true` khi nạn nhân Voodoo rút lá Điều tra công khai thời điểm xử lý lá Xanh (nhưng không lộ nội dung lá hay kết quả).

---

## 4. Rủi ro Hạ tầng & Giới hạn Vận hành

1. **Chưa có môi trường Staging Worker thường trực (`hust-hsk-rooms-staging` = HTTP 404):** Cấu hình `[env.staging]` đã sẵn sàng trong `worker/wrangler.toml`, nhưng CI hiện tại kiểm thử trên real SQLite DO cục bộ + 5 shard Playwright E2E rồi deploy trực tiếp lên `hust-hsk-rooms`. Khuyến nghị bổ sung job deploy staging nếu lượng người chơi đồng thời tăng cao.
2. **Câu hỏi đối chiếu luật gốc (`house-rule-approved`):** `52/56` nhân vật mở rộng giữ nhãn `house-rule-approved` (nổi bật: `RC-02` Undead 6 HP vs 6 vết thương, `RC-04` Vengeful Spirit ngưỡng Neutral, `RC-15` Dalton rãnh vết thương). Mọi thay đổi luật sẽ được gắn phiên bản `catalogVersion` mới và công bố trong changelog Beta.
3. **Giới hạn khi lùi quá sâu về engine cũ:** Xem [`rollback-runbook.md`](./rollback-runbook.md) — Rollback bằng cờ `ENABLE_PRODUCTION_BETA_EXPANSIONS="0"` an toàn tuyệt đối và giữ nguyên mọi trận đang chạy; chỉ lùi mã nguồn về bản trước Phase 7B mới làm mất khả năng đọc trạng thái các trận Tier-4 đang dang dở.

---

## 5. Nhật ký Bản vá Production Beta (Phase 8B–8C Patch · 2026-11-21)

Bản vá **Phase 8B–8C** được phát hành nhằm nâng cao độ đúng đắn gameplay, bảo mật vai ẩn và độ hoàn thiện hiệu ứng nhân vật trong Production Beta (không thay đổi chỉ số cân bằng nhân vật, không thay đổi bộ cờ rollout Beta và giữ nguyên 100% hành vi Classic):

- **Sửa 9 lỗi gameplay & multiplayer đã xác nhận (3 P0, 6 P1 — [`phase-8b-bug-register.md`](./phase-8b-bug-register.md)):**
  - Chặn lỗ hổng lộ phe/bắt lộ vai ẩn trên `eq-13`/`eq-14`/`ev-13` khi đang bị Voodoo điều khiển lượt (`BUG-8B-01`).
  - Bảo toàn `turn_deadline_ms` cho `pendingChoice` sau F5/reconnect khi `turn_timeout_ms <= 0` (`BUG-8B-02`) và làm mới deadline lượt khi `pendingChoice` kết thúc trong cùng lượt (`BUG-8B-03`).
  - Khắc phục bỏ qua lượt kế khi timeout `pendingChoice` đã tự kết thúc lượt (`BUG-8B-04`), chặn Undead lách luật tự lộ vai trước đòn chí tử qua `ev-13` (`BUG-8B-05`), đồng bộ `DynamicAllegiance` của Bonnie sau khi chuyển sang Shadow (`BUG-8B-06`), hợp nhất `DynamicSkillCopy` xuyên suốt 13+ hook runtime (`BUG-8B-07`), vá các biên `COPY_GOAL`/Angel/Cruz/Arlene/Dalton/Charles/Antimony (`BUG-8B-08`), và sửa lỗi Father Harrison Sunday Service cướp `ON_MOVE` khi `ROLL_DICE` (`BUG-8B-09`).
- **Nâng cấp Hệ thống Sự kiện Hình ảnh Có cấu trúc & VFX 66 Nhân vật ([`character-vfx-coverage-matrix.md`](./character-vfx-coverage-matrix.md), [`tier4-signature-vfx-report.md`](./tier4-signature-vfx-report.md)):**
  - Triển khai luồng `visualEvents` công khai có rào chắn bảo mật P0 tập trung, giới hạn 48 sự kiện/trận và khử trùng lặp tuyệt đối khi F5/reconnect.
  - Hoàn thiện VFX Canvas 2D, chỉ báo quân cờ (`💤 Ngủ Đông`, `🧵`/`🔒` Con rối Voodoo, `⚖️` Cain), màn hình **Đồng thắng song phe (`MultiFactionVictory`)** và âm thanh WebAudio đồng bộ cho toàn bộ **8/8 nhân vật Tier-4** cùng **7 họ hiệu ứng Tier-3**; sửa độ tương phản nền màn hình Chiến Thắng trên Mobile/Low tier (`bg-slate-950/95`).
- **Trạng thái chưa thay đổi:** Số trận người thật hoàn tất vẫn là **`0 / 100`** tính tới lúc phát hành bản vá; các rủi ro cân bằng bot-meta (Mục 2), kênh phụ thời gian tồn dư (Mục 3) và việc chưa có staging Worker thường trực (Mục 4) vẫn giữ nguyên để theo dõi qua dữ liệu người chơi thật.
