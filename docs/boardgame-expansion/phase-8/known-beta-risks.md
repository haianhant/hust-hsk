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
