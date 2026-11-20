# Bóng Đêm KTX — Phase 2 Integration & Verification Test Report

> **Tổng quan:** Toàn bộ **57/57 BoardGame unit + Durable Object tests** (`0 fail`), **10,000-match Starter Eight simulation** (`0 stall`, `0 draw`, `0 privacy leak`), **4,500-match Classic baseline** (`0.00% diff`), **Playwright E2E (`e2e-05-06`)**, và toàn bộ **6+ cổng kiểm thử hồi quy dự án** (`typecheck`, `test:learn`, `test:contracts`, `test:world`, `test:avatar`, `test:ui`, `test:study`, `test:nav`, `test:mp`, `build`) đều đạt **PASS (exit code 0)**.

---

## 1. Ma trận Phủ Kịch bản Kiểm thử Phase 2A / 2B / 2C

| # | Kịch bản yêu cầu | File & Mã Test | Kết quả |
|---|---|---|---|
| 1 | **4P & 8P real DO matches trên `starter-four` và `starter-eight`** (chơi xuyên suốt tới `FINISHED`, kiểm tra unique role dealing & `finalReveal`) | `P2A-6`, `P2B-6`, `P2C-2` | ✅ PASS |
| 2 | **Attack, Reveal, Draw (White/Black/Green), Heal, Damage Reduction, Boost, Reroll, Elimination** | `P2A-2a..5`, `P2B-2..5` | ✅ PASS |
| 3 | **Reaction Timeout Alarm** (cả in-turn Fiona/Gayle/Felicia/Victor và out-of-turn secret Wendigo/Undying) | `P2A-4`, `P2A-6`, `P2B-2..4`, `P2B-6`, `P2C-2` | ✅ PASS |
| 4 | **F5 Reconnect** giữa Pending Choice (khôi phục chính xác xúc xắc Fiona / 2 lá bài Felicia, không lặp RNG/kỹ năng) | `P2A-6`, `P2B-6` | ✅ PASS |
| 5 | **Duplicate `requestId` Idempotency** (retry gói `RESOLVE_CHOICE` trả cùng `revision`, không thực thi 2 lần) | `P2A-6`, `C1` | ✅ PASS |
| 6 | **Spectator Privacy P0** (`privateView === null`; ẩn `ownerPlayerId` & `kind` khi `isSecret === true`; không lộ 2 lá bài Felicia; không lộ vai chưa lật) | `P2A-2a`, `P2A-6`, `P2B-3`, `P2B-5`, `P2B-6`, `C1` | ✅ PASS |
| 7 | **Concurrent Matches Isolation** (`classic` Bàn 1 + `starter-eight` Bàn 2 chạy đồng thời trên cùng server) | `P2C-2`, Playwright `E2E-05` | ✅ PASS |
| 8 | **Durable Object Hibernation / Restart** giữa trận & giữa Pending Choice (`/__bg_hibernate`) | `P2A-6`, `P2B-6` | ✅ PASS |
| 9 | **Dual / Chained Simultaneous Triggers** (Wyvern kill + hidden Wendigo pre-victory; Victor Machine Gun + hidden Undying + 2nd kill hidden Wendigo) | `P2C-1` | ✅ PASS |
| 10 | **Disconnect Mid-Choice (Zero Stall)** (chủ choice rớt mạng -> DO rút ngắn deadline & alarm tự hoàn tất -> ván kết thúc sạch) | `P2C-2` | ✅ PASS |
| 11 | **Anti-Spoof & Production Lock** (chặn client gửi `d6`/`d4` giả, chặn `starter-four`/`starter-eight`/`expansion-*` khi không bật `ALLOW_EXPERIMENTAL_RULESETS=1`) | `P2A-1`, `P2A-4`, `P2A-6`, `P2B-1`, `P2B-6`, Playwright `E2E-06` | ✅ PASS |
| 12 | **Midnight Noir UI Metadata, VFX Queue, Sound & Reduced Motion** cho cả 8 tướng Starter Eight (0 rò rỉ VFX khi ẩn vai) | `P2C-3`, `test/boardgame-vfx.test.cjs` | ✅ PASS |

---

## 2. Chi tiết Các Bộ Kiểm thử Đã Chạy & Xác minh

| Bộ kiểm thử / Gate | Lệnh thực thi | Kết quả | Chi tiết |
|---|---|---|---|
| **Catalog Validator** | `node scripts/validate-character-catalog.cjs` | ✅ PASS | 56 tướng mở rộng (`verified=4`, `house-rule-approved=4`, `needs-clarification=48`; `implemented=8`, `not-started=48`; `activeInGameplay=false`). |
| **TypeScript Typecheck** | `npm run typecheck` | ✅ PASS | 0 lỗi trên Frontend (`tsconfig.json`), Shared Contracts và Cloudflare Worker (`worker/tsconfig.json`). |
| **BoardGame Suite (57 tests)** | `npm run test:boardgame` | ✅ PASS | `boardgame-lounge`, `boardgame-lobby-do`, `boardgame-engine` (10/10), `boardgame-match-do`, `boardgame-expansion-foundation` (10/10 + 25/25 SHA-256), `boardgame-phase2a` (7/7), `boardgame-phase2b` (6/6), `boardgame-phase2c-integration` (3/3) + **4,500-match Classic sim** PASS. |
| **Starter Eight 10,000-Match Sim** | `node scripts/sim-starter-eight.cjs --write-json` | ✅ PASS | 10,000/10,000 trận hoàn tất trong `24.7s` (`0 stalled`, `0 draws`, `0 privacy leaks`, `43,547` pending choices resolved). |
| **HSK Engine** | `npm run test:learn` | ✅ PASS | 45/45 unit tests PASS. |
| **Shared Contracts** | `npm run test:contracts` | ✅ PASS | 5/5 (12 assertions) PASS. |
| **World / Avatar / UI / VFX / Study** | `npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study` | ✅ PASS | Toàn bộ PASS (gồm 25/25 `boardgame-vfx.test.cjs`). |
| **Campus Nav** | `npm run test:nav` | ✅ PASS | 4/4 chặng A* PASS. |
| **Multiplayer Protocol** | `npm run test:mp` | ✅ PASS | 33/33 assertions (12 kịch bản WS + hibernation) PASS. |
| **Static Build** | `npm run build` | ✅ PASS | Next.js 14.2.5 static export (`out/`) thành công, 0 lỗi lint/type. |
| **Playwright Browser E2E** | `CHROME_PATH=/usr/bin/google-chrome node test/boardgame-e2e.cjs --shard=e2e-05-06` | ✅ PASS | Concurrent 2-match isolation + 4/4 WebSocket security probes PASS (`43.1s`). |
