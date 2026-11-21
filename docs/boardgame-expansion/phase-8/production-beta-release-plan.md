# Bóng Đêm KTX — Phase 8A Production Beta Release Plan

> **Quyết định Phát hành:** Chủ dự án phê duyệt phát hành có kiểm soát (**Production Beta / Early Access**) cho 3 gói mở rộng `expansion-1` (36 tướng), `expansion-2` (40 tướng) và `full-expansion` (66 tướng) song song với chế độ mặc định ổn định `classic` (10 tướng).  
> **Nguyên tắc An toàn:** Đây là đợt **Opt-In Production Beta**, **KHÔNG** phải tuyên bố đã hoàn tất kiểm thử người thật (`0 / 100` trận người thật) hay đã chốt cân bằng dài hạn. Mọi pool thử nghiệm nội bộ lịch sử (`starter-four` .. `starter-fifty-six`) tiếp tục bị khóa cứng khỏi production.

---

## 1. Kiến trúc Phát hành & Trạng thái Các Bộ luật

| Ruleset ID | Nhân vật | Vai trò trên Production | `releaseStatus` | Trạng thái UI | Quyền điều khiển |
|---|---:|---|---|---|---|
| **`classic`** | `10` (`3H/3S/4N`) | **Mặc định · Ổn định** | `PUBLIC_RELEASE_APPROVED` | `Stable` | Luôn bật; không phụ thuộc cờ Beta |
| **`expansion-1`** | `36` (`11H/12S/13N`) | **Opt-In Beta** | `PRODUCTION_BETA_ENABLED` | `Beta` *(hoặc `Unavailable` nếu tắt cờ)* | Server-controlled qua `ENABLE_PRODUCTION_BETA_EXPANSIONS` + `BETA_ALLOWED_RULESETS` |
| **`expansion-2`** | `40` (`12H/12S/16N`) | **Opt-In Beta** | `PRODUCTION_BETA_ENABLED` | `Beta` *(hoặc `Unavailable` nếu tắt cờ)* | Server-controlled qua `ENABLE_PRODUCTION_BETA_EXPANSIONS` + `BETA_ALLOWED_RULESETS` |
| **`full-expansion`** | `66` (`20H/21S/25N`) | **Opt-In Beta** | `PRODUCTION_BETA_ENABLED` | `Beta` *(hoặc `Unavailable` nếu tắt cờ)* | Server-controlled qua `ENABLE_PRODUCTION_BETA_EXPANSIONS` + `BETA_ALLOWED_RULESETS` |
| `starter-four` .. `starter-fifty-six` | `14..66` | **Bị khóa cứng (Internal Only)** | `INTERNAL_VALIDATED` | Không hiển thị trên Public API/UI | Chỉ bật khi đặt `ALLOW_EXPERIMENTAL_RULESETS=1` trong harness kiểm thử nội bộ |

---

## 2. Kết quả Kiểm tra Tiền phát hành (Pre-Flight Audit)

Kiểm tra trực tiếp trước khi triển khai Phase 8A trên production (`64f5ae4f0c0e2dbfee93b95f96129a1ecf95e4c4`):
- **Frontend Production:** `https://hustverse.vercel.app/` (HTTP 200, triển khai tự động từ nhánh `main` qua Vercel).
- **Cloudflare Worker Production:** `https://hust-hsk-rooms.hunganhz179.workers.dev` (`catalogVersion: "2026.11-p7b"`, `protocolVersion: 1`, `rulesetVersion: 4`, triển khai qua GitHub Actions `Deploy Cloudflare Worker (hust-hsk-rooms)`).
- **Trạng thái Trận đang hoạt động (`GET /api/boardgame/matches`):** `0` trận đang chạy (`matches: []`).
- **Dữ liệu Bền vững Hiện hữu (`GET /api/boardgame/leaderboard`):** **CÓ 4 hồ sơ bảng xếp hạng thực tế** (từ 1 trận Classic lịch sử đã hoàn tất lưu trong SQLite Durable Object `__lounge_directory__`). Tuyệt đối **KHÔNG** thực hiện migration phá hủy dữ liệu; toàn bộ bảng telemetry Phase 8A là additive (`CREATE TABLE IF NOT EXISTS`).
- **Worker Staging (`hust-hsk-rooms-staging`):** Hiện chưa khởi tạo (`HTTP 404`); quy trình CI/CD của kho mã nguồn kiểm chứng cục bộ bằng real SQLite DO harness (`boardgame-do-harness.cjs`), chạy đủ `Gates 1–8` (gồm 5 shard Playwright E2E) trước khi job `deploy-worker` đẩy lên production.

---

## 3. Quy trình Cải tiến Liên tục Sau Phát hành (Post-Release Beta Loop)

Sau khi bật Production Beta, dự án chuyển sang chu trình cải tiến lặp lại chuẩn kỹ thuật:

`Issue → Reproduce (test) → Fix → CI (Gates 1–8) → Deploy → Verify`

Mọi thay đổi sau Phase 8A bắt buộc phân loại rõ ràng trong changelog và **không bao giờ chỉnh sửa trực tiếp dữ liệu production hay vá mã nguồn ngoài Git**:
1. **Critical Security / Game-Breaking Hotfix** — ưu tiên ngay lập tức (kèm unit/DO regression test; tắt tạm cờ Beta nếu cần trong khi vá).
2. **Gameplay Bug Fix** — tái hiện bằng deterministic seed/unit test trước khi sửa.
3. **Balance Change** — gắn phiên bản catalog mới (ví dụ `2026.11-p8b`), ghi log rõ trước/sau trong changelog để so sánh telemetry Beta, và bảo vệ các trận đang chạy khỏi bị thay đổi luật đột ngột giữa ván.
4. **UX Improvement** — cải thiện độ rõ kỹ năng, tốc độ tương tác `PendingChoice` và chỉ báo Tier-4 dựa trên phản hồi người thật.
5. **New Feature** — tách nhánh/milestone riêng, không trộn lẫn với hotfix cân bằng.
