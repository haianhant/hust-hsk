# Bóng Đêm KTX v3.1 — Trạng thái Sẵn sàng Phát hành (`Release Candidate Status`)

> **Dự án:** HUSTVerse — Bách Khoa 3D (`haianhant/hust-hsk`)  
> **Nhánh phát triển:** `feat/boardgame-v2-deduction`  
> **Phân loại hiện tại:** **`TECHNICAL_RC`** *(Release Candidate Kỹ thuật — Đủ điều kiện kỹ thuật cho Staging & UAT Người thật; **chưa** merge `main` và **chưa** deploy production theo đúng giới hạn nhiệm vụ)*

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
| **`E2E-01`** | Vòng đời đầy đủ 4p Desktop+Mobile, luật, âm thanh, emote, Postcard `1200×675` PNG, về KTX | `VERIFIED` | `test/boardgame-e2e.cjs` (`E2E-01`), chạy portable qua `playwright-core` không đường dẫn máy cá nhân. |
| **`E2E-02`** | Bàn 8p + Khán giả thứ 9 (`privateView === null`, zero leak) | `VERIFIED` | `test/boardgame-e2e.cjs` (`E2E-02`). |
| **`E2E-03`** | Ma trận reload giữa phiên 5 mốc (`READY_CHECK`, lượt mình, lượt người khác, sau lật vai, `FINISHED`) | `VERIFIED` | `test/boardgame-e2e.cjs` (`E2E-03`). |
| **`E2E-04`** | Responsive Mobile `390×844` (Lobby + 3 tab Board + kích thước nút cảm ứng + lượt chơi thật) | `VERIFIED` | `test/boardgame-e2e.cjs` (`E2E-04`). |
| **`E2E-05`** | Cách ly trạng thái 2 trận đồng thời & `GET /api/boardgame/health` | `VERIFIED` | `test/boardgame-e2e.cjs` (`E2E-05`). |
| **`E2E-06`** | Probe bảo mật WebSocket từ trình duyệt thật (cross-match token, JSON lỗi, unknown type, prototype key) | `VERIFIED` | `test/boardgame-e2e.cjs` (`E2E-06`). |
| **`OPS-01`** | Structured JSON logs (allowlist, zero secret/MSSV) & endpoint `/api/boardgame/health` | `VERIFIED` | `worker/src/boardgame-observability.ts` & `worker/src/boardgame-router.ts`. |
| **`OPS-02`** | Cấu hình `[env.staging]` & kiểm chứng triển khai Cloudflare Staging | `PENDING_EXTERNAL` | Đã thêm `[env.staging]` trong `worker/wrangler.toml` và pass `npx wrangler deploy --dry-run --env staging` cục bộ; chưa deploy lên tài khoản Cloudflare live vì thiếu token ngoại vi. |
| **`OPS-03`** | Tài liệu hướng dẫn Deploy Staging, Tail Logs & Rollback Runbook | `VERIFIED` | Xem `docs/features/boardgame-v3.1-release-runbook.md`. |
| **`OPS-04`** | Portable Playwright CI Pipeline trên `.github/workflows/ci.yml` (`main` & `feat/**`) | `VERIFIED` | Chạy đủ Gate `1..8` + upload artifact lỗi `test-results/boardgame/`. |
| **`OPS-05`** | Không còn đường dẫn máy cá nhân cứng trong mã nguồn/test/tài liệu v3.1 | `VERIFIED` | Kiểm chứng bằng lệnh `grep`. |
| **`BAL-01`** | Đo thời điểm lật vai & chênh lệch thắng/thua khi lật sớm vs giữ ẩn danh | `VERIFIED` | Kết quả từ 4.500 ván `test/boardgame-sim.cjs`, xem `boardgame-v3.1-balance-analysis.md`. |
| **`BAL-02`** | Phân rã nguyên nhân thắng *Phiên Trực Cuối Đêm* (loại người vs chốt trực vs hòa) | `VERIFIED` | Kết quả từ 4.500 ván `test/boardgame-sim.cjs`. |
| **`BAL-03`** | Phễu thẻ Sự kiện (`mở đầu` → `rút Pha 2` → `Vy lật` → `sử dụng ev-01..ev-08` → `tồn cuối ván`) | `VERIFIED` | Kết quả từ 4.500 ván `test/boardgame-sim.cjs`. |
| **`BAL-04`** | Mô hình hóa thời lượng ván người thật (`4p`/`6p`/`8p` × `18s`/`25s`/`32s` mỗi lượt) | `VERIFIED` | Xem bảng định lượng trong `boardgame-v3.1-balance-analysis.md`. |
| **`UAT-01`** | Thực thi playtest với người thật (4p/6p/8p/Mobile trên Staging) | `PENDING_EXTERNAL` | Chưa chạy phiên người thật trong scope tự động; xem giao thức tại `docs/features/boardgame-v3.1-uat-plan.md`. |
| **`UAT-02`** | Tài liệu hóa giao thức, kịch bản 5 phút & rubric chấm công thái học Mobile/Desktop | `VERIFIED` | `docs/features/boardgame-v3.1-uat-plan.md`. |
| **`UAT-03`** | Đồng bộ hóa `boardgame-v3-rules.md`, 3D Lounge board & Lobby UI với cơ chế v3.1 | `VERIFIED` | Đã chỉnh sửa đầy đủ & rà soát khớp 100% với code. |
| **`REL-01`** | Hợp nhất (Merge) vào nhánh `main` | `NOT_EXECUTED` | Tuân thủ ràng buộc không tự merge vào `main`. |
| **`REL-02`** | Phát hành Production (Cloudflare Worker + Vercel `hustverse.vercel.app`) | `NOT_EXECUTED` | Tuân thủ ràng buộc không deploy production tự động; chỉ thực hiện sau Staging + Human UAT. |
| **`REL-03`** | Push lên `origin/feat/boardgame-v2-deduction` & GitHub Actions PASS trên đúng SHA mới nhất | `VERIFIED` | Đã đẩy nhánh `origin/feat/boardgame-v2-deduction` và kiểm chứng toàn bộ Gate `1..8` trong `.github/workflows/ci.yml` PASS trên đúng `HEAD` SHA. |

---

## 2. Kết luận Điều kiện Phát hành (Go-Live Gate)

- **Trạng thái hiện tại:** **`TECHNICAL_RC`** (Release Candidate kỹ thuật sẵn sàng trên `feat/boardgame-v2-deduction`).
- **Điều kiện cần để chuyển từ `TECHNICAL_RC` → `PRODUCTION_READY`:**
  1. Deploy Worker lên `[env.staging]` (`OPS-02`) và trỏ Vercel Preview xác nhận `/api/boardgame/health` + websocket thực tế.
  2. Hoàn tất 4 phiên chơi thử nghiệm với người thật đạt tiêu chí Go/No-Go trong `boardgame-v3.1-uat-plan.md` (`UAT-01`).
  3. Chủ dự án phê duyệt PR merge `feat/boardgame-v2-deduction` → `main` (`REL-01`, `REL-02`).
