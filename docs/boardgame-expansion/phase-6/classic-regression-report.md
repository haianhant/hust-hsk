# Bóng Đêm KTX — Phase 6 Classic Zero-Regression Proof Report

> **Mục tiêu:** Chứng minh tuyệt đối **0.00% hồi quy (zero regression)** đối với bản **Classic Production** (10 nhân vật Classic, 48 lá bài Classic, PRNG Classic, điều kiện thắng Classic, định tuyến production `classic`-only, và tương thích dữ liệu lịch sử) sau toàn bộ các thay đổi Phase 6A–6E (`starter-forty-eight` · 58 nhân vật).

---

## 1. Bất biến Mã nguồn & Khóa Production

| Hạng mục Kiểm chứng | Công cụ / Bằng chứng | Kết quả |
|---|---|---|
| **`features/boardgame/domain/victory.ts` nguyên vẹn 100%** | `git diff --stat 5e91f04..HEAD -- features/boardgame/domain/victory.ts` | **0 dòng thay đổi (0-diff)** |
| **10 nhân vật Classic & 48 lá bài Classic không đổi** | `test/boardgame-engine.test.cjs` (`V4.1`–`V4.10`) | **10/10 PASS** |
| **Classic PRNG Bit-for-Bit Equivalence** | `test/boardgame-expansion-foundation.test.cjs` (`B1` — 25/25 SHA-256 baseline fingerprints) | **25/25 MATCH (100%)** |
| **Production Routing Strictly Classic-Only** | `P6B-1`, `P6C-5`, `P6D-4` (`ALLOW_EXPERIMENTAL_RULESETS` unset) | **`starter-forty-eight` bị từ chối `HTTP 400 / RULESET_UNAVAILABLE`** |
| **Clean Classic DTO Projection** | `P6D-3` (`#25`) & `P6D-4` (phòng `classic` chạy song song `starter-forty-eight`) | **0 trường mở rộng** (`anathemaCursedTargetByPlayer`, `bethanyChosenTargetByPlayer`, `dianaActiveCustomerByPlayer`, `aaronSpouseByPlayer`, `aprilSkippsCountdownByPlayer`, `clairvoyantReveals`, `copiedVictoryGoalSummary`, `reactionPolicy` đều `undefined`) |
| **SQLite Historical State Compatibility** | `test/boardgame-match-do.test.cjs` (v1/v2/v3 backward compatibility) | **PASS** |

---

## 2. Đối chiếu 4,500 Trận Classic Simulation (`node test/boardgame-sim.cjs`)

Chạy trực tiếp `node test/boardgame-sim.cjs` trên HEAD Phase 6 cho kết quả **trùng khớp tuyệt đối đến từng chữ số thập phân** với baseline trước Phase 6 (`5e91f04`):

| Chỉ số Classic (4,500 trận: 900 × 5 từ 4P–8P) | Baseline trước Phase 6 (`5e91f04`) | Sau Phase 6 (`starter-forty-eight`) | Sai lệch (Delta) |
|---|---:|---:|---:|
| `totalGames` / `stalledGames` / `draws` | `4,500` / `0` / `0` | **`4,500` / `0` / `0`** | **`0`** |
| `botAccessViolations` | `0` | **`0`** | **`0`** |
| `avgRounds` | `7.34` | **`7.34`** | **`0.00`** |
| `avgTurns` | `32.36` | **`32.36`** | **`0.00`** |
| `earlyEndRounds1To2Pct` | `2.02%` | **`2.02%`** | **`0.00%`** |
| `round1PlayerDeathRatePct` | `0.448%` | **`0.448%`** | **`0.000%`** |
| `avgEliminationsPerGame` | `3.21` | **`3.21`** | **`0.00`** |
| **Hunter (`lanternGuardPct`)** | `39.73%` | **`39.73%`** | **`0.00%`** |
| **Shadow (`mistOrderPct`)** | `45.56%` | **`45.56%`** | **`0.00%`** |
| **Neutral Primary (`wandererPrimaryPct`)** | `14.71%` | **`14.71%`** | **`0.00%`** |
| **Wanderer 5P–8P Win Rate** | `35.83%` | **`35.83%`** | **`0.00%`** |

- **Tỷ lệ thắng 10 nhân vật Classic (`0.00%` sai lệch trên cả 10/10 vai):**
  `Minh 40.54%`, `Lan 36.18%`, `Vy 41.41%`, `Tú 45.55%`, `Khánh 42.92%`, `Dũng 46.80%`, `Hải 15.72%`, `Trang 61.69%`, `Bách 24.24%`, `Đạt 42.02%`.

---

## 3. Kết luận Nghiệm thu Classic

Toàn bộ cổng bảo vệ Classic đạt **0.00% hồi quy** về RNG, luật chơi, điều kiện thắng, DTO bảo mật và định tuyến production. Bản `classic` trên production hoàn toàn an toàn để tiếp tục vận hành độc lập với `starter-forty-eight`.
