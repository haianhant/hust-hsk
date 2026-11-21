# Bóng Đêm KTX — Production Beta Rollback Runbook

> **Mục tiêu Rollback:** Tắt ngay lập tức khả năng tạo phòng Beta mới khi phát hiện sự cố nghiêm trọng, giữ `classic` hoạt động bình thường 100%, **không xóa dữ liệu người chơi hay bảng xếp hạng**, và bảo toàn các trận Beta đang chạy ở mức tương thích cao nhất.

---

## 1. Rollback Mức 1 — Tắt Cờ Feature Flag (Nhanh, An toàn Nhất — Khuyến nghị Đầu tiên)

### Phương án 1A: Tắt tức thì trên Cloudflare Dashboard (không chờ CI)
1. Đăng nhập Cloudflare Dashboard → **Workers & Pages** → chọn Worker **`hust-hsk-rooms`** → **Settings → Variables and Secrets**.
2. Để tắt **toàn bộ 3 gói Beta**: đổi `ENABLE_PRODUCTION_BETA_EXPANSIONS` từ `"1"` thành `"0"` và lưu (**Deploy**).
3. Để tắt **riêng 1 gói lỗi** (ví dụ tắt `full-expansion`, giữ `expansion-1` và `expansion-2`): sửa `BETA_ALLOWED_RULESETS` thành `"expansion-1,expansion-2"` và lưu.
4. Đồng bộ lại thay đổi tương ứng vào [`worker/wrangler.toml`](../../../worker/wrangler.toml) trên Git trong lần commit kế tiếp để tránh drift cấu hình ở lần CI deploy sau.

### Phương án 1B: Rollback qua Git & CI/CD Chuẩn (Auditable)
Sửa [`worker/wrangler.toml`](../../../worker/wrangler.toml):
```toml
[vars]
ENVIRONMENT = "production"
ENABLE_PRODUCTION_BETA_EXPANSIONS = "0"
BETA_ALLOWED_RULESETS = ""
```
Hoặc loại bỏ gói lỗi khỏi `BETA_ALLOWED_RULESETS`, sau đó commit & push lên `main`:
```bash
git add worker/wrangler.toml
git commit -m "chore(boardgame): disable Production Beta expansions via feature flag rollback"
git push origin main
```

### Hiệu ứng Thực tế Đã Kiểm chứng (`P8A-3` trong `test/boardgame-phase8a-beta-release.test.cjs`)
- **Phòng Beta mới:** Bị từ chối ngay lập tức bằng `HTTP 400 / RULESET_UNAVAILABLE`.
- **Phòng Classic mới:** Tiếp tục tạo & chơi hoàn toàn bình thường (`HTTP 201`).
- **UI Sảnh:** Tự cập nhật sang trạng thái `Unavailable` ngay khi nhận `/api/boardgame/rulesets` hoặc `BG_STATE_SYNC`.
- **Trận Beta đang chạy (`PLAYING`):** **Được bảo toàn nguyên vẹn** (vẫn giữ `rulesetId`, người chơi F5 reconnect thành công và chơi hết ván mà không bị chuyển đổi ngầm sang `classic`, không mất dữ liệu).

---

## 2. Rollback Mức 2 — Lùi Phiên bản Mã nguồn Worker / Frontend

Chỉ dùng khi có lỗi nghiêm trọng ngay trong mã nguồn chung mà tắt cờ Beta chưa giải quyết được:
- **Mốc tham chiếu ổn định trước Phase 8A:** `64f5ae4f0c0e2dbfee93b95f96129a1ecf95e4c4` (Phase 7E hoàn chỉnh, 66/66 nhân vật trong engine, Production mặc định `classic`-only).
- **Lệnh git revert chuẩn (không force-push `main`):**
  ```bash
  git revert <phase-8a-commit-sha> --no-edit
  git push origin main
  ```
- Hoặc trên Cloudflare Dashboard → `hust-hsk-rooms` → **Deployments** → chọn phiên bản deployment trước đó và nhấn **Rollback**.

---

## 3. Giới hạn Đã Tài liệu hóa Khi Lùi về Engine Cũ Hơn

- **Tương thích với Phase 7E (`64f5ae4`):** Hoàn toàn tương thích! Engine Phase 7E đã có đủ 66 vai trò, `rulesetVersion === 4` và toàn bộ 6 primitive Tier-4; các bảng SQLite additive (`boardgame_telemetry_*`) vẫn nằm an toàn trong SQLite DO mà không gây lỗi cho mã nguồn Phase 7E.
- **Lùi về các bản CŨ HƠN Phase 7B (trước khi có 8 tướng Tier-4 hoặc `rulesetVersion < 4`):** **KHÔNG tương thích với các trận `expansion-1` / `expansion-2` / `full-expansion` đang `PLAYING`** có chứa vai Tier-4 hoặc cấu trúc `expansionState` mới (`activeTurnControl`, `lifecycleByPlayer`, `alliances`). Trong trường hợp bất khả kháng phải lùi quá sâu, các trận Beta đang dang dở sẽ không khôi phục được qua engine cũ (phòng hết hạn tự đóng sau `BOARD_GAME_ABANDONED_MATCH_TTL_MS = 5 phút`), trong khi bảng xếp hạng lịch sử `boardgame_leaderboard` và các phòng `classic` vẫn được bảo toàn — **tuyệt đối không bao giờ tự xóa dữ liệu SQLite**.
