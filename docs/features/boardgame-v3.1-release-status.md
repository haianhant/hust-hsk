# Bóng Đêm KTX v3.1 — Trạng thái Sẵn sàng Phát hành (`Release Candidate Status`)

> **Dự án:** HUSTVerse — Bách Khoa 3D (`haianhant/hust-hsk`)  
> **Nhánh phát triển:** `feat/boardgame-v2-deduction` → fast-forward vào `main`  
> **Phân loại hiện tại:** **`APPROVED_FOR_MAIN_ROLLOUT`** *(Đã được chủ dự án phê duyệt trực tiếp merge `main` & triển khai production ngay sau khi toàn bộ CI song song Gate `1–8` đạt `PASS`; riêng `OPS-02` staging riêng và `UAT-01` playtest người thật theo khung chuẩn vẫn giữ nguyên trạng thái `PENDING_EXTERNAL` trung thực)*

---

## 1. Bảng Đánh giá Chi tiết Từng Hạng mục (`SEC`, `NET`, `E2E`, `OPS`, `BAL`, `UAT`, `REL`)

| Mã | Hạng mục | Trạng thái | Ghi chú & Bằng chứng Trung thực |
|---|---|---|---|
| **`SEC-01`** | Runtime schema validation, chống prototype-pollution & UTF-8 payload cap | `VERIFIED` | `shared/contracts/boardgame.ts`, `rules.ts`, `cards.ts`, `roles.ts`, `effects.ts`, `boardgame-room.ts`; kiểm chứng qua `boardgame-engine.test.cjs`, `boardgame-match-do.test.cjs`, `E2E-06`. |
| **`SEC-02`** | Auth, CSPRNG 6-char invite code & SHA-256 reconnect token isolation | `VERIFIED` | Từ chối token ngoại lai/sai trên mọi trạng thái (`UNAUTHORIZED`); `E2E-06` + `boardgame-match-do.test.cjs`. |
| **`SEC-03`** | Zero secret leakage (`roleId`, `faction`, `hp` khi `PLAYING`, `hand`, `protege`, `rngState`, MSSV) | `VERIFIED` | Quét toàn bộ WS frames trong `E2E-01..E2E-06` & 4.500 ván `boardgame-sim.cjs` (`botAccessViolations = 0`). |
| **`SEC-04`** | Chống rò rỉ gián tiếp (`Vy` `handCount = null`, `Kỷ Luật Nội Trú` ẩn danh) | `VERIFIED` | Đã sửa & khóa test hồi quy trong `boardgame-engine.test.cjs` (`GV3.4`) và `boardgame-v3-rules.md`. |
| **`SEC-05`** | Origin allowlist, rate limit IP/socket & kẹp `turnTimeoutMs` production `[15s, 90s]` | `VERIFIED` | `worker/src/boardgame-router.ts` & `boardgame-room.ts`; chỉ bật timeout ngắn khi `ALLOW_SHORT_TURN_TIMEOUT=1`. |
| **`SEC-06`** | Bất biến vòng đời `tempShield` 1 vòng & reset khi gục | `VERIFIED` | Đã sửa `addTempShield(player, amount, isActiveTurnPlayer)` và verified qua 6 test vòng đời + 4.500 ván sim. |
| **`SEC-07`** | Audit bảo mật hoàn chỉnh & không có lỗ hổng P0 mở | `VERIFIED` | Xem `docs/features/boardgame-v3.1-readiness-audit.md` và `docs/features/boardgame-v3.1-security-report.md`. |
| **`NET-01`** | Giao thức hợp đồng dùng chung + `protocolVersion = 1` & forward-compat guard | `VERIFIED` | Client báo nâng cấp khi gặp `rulesetVersion > 3` hoặc `protocolVersion` mới hơn. |
| **`NET-02`** | Đếm ngược timeout lượt & hibernation recovery SQLite DO | `VERIFIED` | `test/boardgame-match-do.test.cjs` `(1)..(8)` & `test/boardgame-lobby-do.test.cjs`. |
| **`NET-03`** | Sảnh `WAITING`/`READY_CHECK` reconnect không kẹt & dọn rác `CREATED`/`PLAYING` bỏ hoang | `VERIFIED` | `recomputeLobbyStatus()`, `BG_REQUEST_SYNC`, dọn `CREATED` sau 45s và `PLAYING` bỏ hoang sau 5 phút (`BOARD_GAME_ABANDONED_MATCH_TTL_MS`). |
| **`NET-04`** | Cô lập đồng thời 2 bàn 4p/8p + spectator tách biệt hoàn toàn | `VERIFIED` | `E2E-02` (8p + 9th Spectator) & `E2E-05` (2 trận song song Table 1 + Table 2). |
| **`NET-05`** | Benchmark độ trễ & băng thông `4p` / `8p` (`p50`/`p95`/`p99`, KB/frame, SQLite bytes) | `VERIFIED` | Xem số liệu đo thực tế tại `docs/features/boardgame-v3.1-test-report.md` (`test/boardgame-perf-bench.cjs`). |
| **`E2E-01`** | Vòng đời đầy đủ 4p Desktop+Mobile, luật, âm thanh, emote, Postcard `1200×675` PNG, về KTX | `VERIFIED` | `test/boardgame-e2e.cjs` (`--shard=e2e-01-04`), chạy portable qua `playwright-core` không đường dẫn máy cá nhân. |
| **`E2E-02`** | Bàn 8p + Khán giả thứ 9 (`privateView === null`, zero leak) | `VERIFIED` | `test/boardgame-e2e.cjs` (`--shard=e2e-02`). |
| **`E2E-03`** | Ma trận reload giữa phiên 5 mốc (`READY_CHECK`, lượt mình, lượt người khác, sau lật vai, `FINISHED`) | `VERIFIED` | `test/boardgame-e2e.cjs` (`--shard=e2e-03`). |
| **`E2E-04`** | Responsive Mobile `390×844` (Lobby + 3 tab Board + kích thước nút cảm ứng + lượt chơi thật) | `VERIFIED` | `test/boardgame-e2e.cjs` (`--shard=e2e-01-04`). |
| **`E2E-05`** | Cách ly trạng thái 2 trận đồng thời & `GET /api/boardgame/health` | `VERIFIED` | `test/boardgame-e2e.cjs` (`--shard=e2e-05-06`). |
| **`E2E-06`** | Probe bảo mật WebSocket từ trình duyệt thật (cross-match token, JSON lỗi, unknown type, prototype key) | `VERIFIED` | `test/boardgame-e2e.cjs` (`--shard=e2e-05-06`). |
| **`OPS-01`** | Structured JSON logs (allowlist, zero secret/MSSV) & endpoint `/api/boardgame/health` | `VERIFIED` | `worker/src/boardgame-observability.ts` & `worker/src/boardgame-router.ts`. |
| **`OPS-02`** | Cấu hình `[env.staging]` & kiểm chứng triển khai Cloudflare Staging | `PENDING_EXTERNAL` | Đã thêm `[env.staging]` trong `worker/wrangler.toml` và pass `npx wrangler deploy --dry-run --env staging` cục bộ; chưa deploy môi trường staging tách riêng. |
| **`OPS-03`** | Tài liệu hướng dẫn Deploy Staging, Tail Logs & Rollback Runbook | `VERIFIED` | Xem `docs/features/boardgame-v3.1-release-runbook.md`. |
| **`OPS-04`** | Portable Playwright CI Pipeline trên `.github/workflows/ci.yml` (`main` & `feat/**`) | `VERIFIED` | Refactored thành DAG 4 job song song (`build-and-unit` → `gate7-pr10b` + 5 matrix shards song song `gate8-boardgame-e2e` [`e2e-01-04`, `e2e-02`, `e2e-03`, `e2e-05-06`, `bg1-smoke`] → `deploy-worker` trên `main`) + upload artifact `test-results/boardgame/`. |
| **`OPS-05`** | Không còn đường dẫn máy cá nhân cứng trong mã nguồn/test/tài liệu v3.1 | `VERIFIED` | Kiểm chứng bằng lệnh `grep`. |
| **`BAL-01`** | Đo thời điểm lật vai & chênh lệch thắng/thua khi lật sớm vs giữ ẩn danh | `VERIFIED` | Kết quả từ 4.500 ván `test/boardgame-sim.cjs`, xem `boardgame-v3.1-balance-analysis.md`. |
| **`BAL-02`** | Phân rã nguyên nhân thắng *Phiên Trực Cuối Đêm* (loại người vs chốt trực vs hòa) | `VERIFIED` | Kết quả từ 4.500 ván `test/boardgame-sim.cjs`. |
| **`BAL-03`** | Phễu thẻ Sự kiện (`mở đầu` → `rút Pha 2` → `Vy lật` → `sử dụng ev-01..ev-08` → `tồn cuối ván`) | `VERIFIED` | Kết quả từ 4.500 ván `test/boardgame-sim.cjs`. |
| **`BAL-04`** | Mô hình hóa thời lượng ván người thật (`4p`/`6p`/`8p` × `18s`/`25s`/`32s` mỗi lượt) | `VERIFIED` | Xem bảng định lượng trong `boardgame-v3.1-balance-analysis.md`. |
| **`UAT-01`** | Thực thi playtest với người thật (4p/6p/8p/Mobile) | `PENDING_EXTERNAL` | Chưa chạy phiên người thật theo giao thức 4 buổi trong scope tự động; xem `docs/features/boardgame-v3.1-uat-plan.md`. |
| **`UAT-02`** | Tài liệu hóa giao thức, kịch bản 5 phút & rubric chấm công thái học Mobile/Desktop | `VERIFIED` | `docs/features/boardgame-v3.1-uat-plan.md`. |
| **`UAT-03`** | Đồng bộ hóa `boardgame-v3-rules.md`, 3D Lounge board & Lobby UI với cơ chế v3.1 | `VERIFIED` | Đã chỉnh sửa đầy đủ & rà soát khớp 100% với code. |
| **`REL-01`** | Hợp nhất (Merge) vào nhánh `main` | `APPROVED_FOR_MAIN_ROLLOUT` | Chủ dự án phê duyệt trực tiếp merge fast-forward `feat/boardgame-v2-deduction` → `main` ngay sau khi toàn bộ CI song song Gate `1–8` đạt `PASS`. |
| **`REL-02`** | Phát hành Production (Cloudflare Worker `hust-hsk-rooms` + Vercel `hustverse.vercel.app`) | `APPROVED_FOR_MAIN_ROLLOUT` | Chủ dự án phê duyệt trực tiếp triển khai qua CI job `deploy-worker` & Vercel Production trên nhánh `main` sau khi hợp nhất sạch cùng SHA. |
| **`REL-03`** | Push lên `origin/feat/boardgame-v2-deduction` & GitHub Actions PASS trên đúng SHA mới nhất | `VERIFIED` | Kiểm chứng toàn bộ DAG 4 job (Gate `1–6`, `gate7-pr10b`, và 5 shard `gate8-boardgame-e2e`) PASS trên GitHub Actions trước khi fast-forward vào `main`. |

---

## 2. Kết luận Điều kiện Phát hành (Go-Live Gate)

- **Trạng thái hiện tại:** **`APPROVED_FOR_MAIN_ROLLOUT`** — Toàn bộ kiểm thử kỹ thuật, E2E trình duyệt (5 shard song song), bảo mật và benchmark trên `feat/boardgame-v2-deduction` đã sẵn sàng hợp nhất fast-forward vào `main` và phát hành đồng bộ **Cloudflare Worker (`hust-hsk-rooms`)** + **Vercel Production (`https://hustverse.vercel.app/`)** theo yêu cầu trực tiếp của chủ dự án.
- **Lưu ý hậu phát hành (`PENDING_EXTERNAL`):**
  1. Deploy tách riêng Worker `[env.staging]` (`OPS-02`) nếu cần môi trường sandbox cô lập trước các đợt nâng cấp tiếp theo.
  2. Thu thập phản hồi & hoàn tất 4 phiên playtest người thật theo biểu mẫu [`docs/features/boardgame-v3.1-uat-plan.md`](./boardgame-v3.1-uat-plan.md) (`UAT-01`) sau khi lên production.
