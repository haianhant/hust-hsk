# Bóng Đêm KTX — Phase 7 Classic Zero-Regression Proof Report

> **Mục tiêu:** Chứng minh tuyệt đối **0.00% hồi quy (zero regression)** đối với bản **Classic Production** (10 nhân vật Classic, 48 lá bài Classic, PRNG Classic, điều kiện thắng Classic, định tuyến production `classic`-only, DTO bảo mật Classic và tương thích dữ liệu SQLite lịch sử) sau toàn bộ các thay đổi Phase 7A–7E (`starter-fifty-six` · **66/66 nhân vật**).

---

## 1. Bất biến Mã nguồn, Hợp đồng DTO & Khóa Production

| Hạng mục Kiểm chứng | Công cụ / Bằng chứng Thực tế | Kết quả |
|---|---|---|
| **`features/boardgame/domain/victory.ts` nguyên vẹn 100%** | `git diff --stat e3dfeac..HEAD -- features/boardgame/domain/victory.ts` | **0 dòng thay đổi (0-diff tuyệt đối)** |
| **10 nhân vật Classic & 48 lá bài Classic không đổi** | `test/boardgame-engine.test.cjs` (`V4.1`–`V4.10`) | **10/10 PASS** |
| **Classic PRNG Bit-for-Bit Equivalence** | `test/boardgame-expansion-foundation.test.cjs` (`B1` — 25/25 SHA-256 baseline fingerprints) | **25/25 MATCH (100%)** |
| **Production Routing Strictly Classic-Only** | `test/boardgame-phase7b.test.cjs` (`P7B-9`), `test/boardgame-phase7c-portraits.test.cjs` (`P7C-5`), `test/boardgame-phase7d-integration.test.cjs` (`P7D-4`) | **`starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion` đều bị chặn cứng `HTTP 400 / RULESET_UNAVAILABLE` khi `ALLOW_EXPERIMENTAL_RULESETS` không bật** |
| **Clean Classic DTO Projection** | `test/boardgame-phase7d-integration.test.cjs` (`P7D-3 #30` & `P7D-4` phòng `classic` chạy song song `starter-fifty-six`) | **0 trường mở rộng Phase 7** (`controlledTurn`, `alliances`, `winningFactions`, `lifecycleState`, `effectiveFaction`, `copiedSkillSourceRoleId`, `cainDeathModifierActive` đều `undefined` trên phòng Classic) |
| **SQLite Historical State Compatibility** | `test/boardgame-match-do.test.cjs` + `test/boardgame-phase7d-integration.test.cjs` (`P7D-5`) | **PASS** — tương thích ngược hoàn toàn với snapshot phòng cũ chưa có trường mở rộng |
| **Static Build & Deployment Behavior** | `npm run build` (Next.js static export `out/`) + `npm run typecheck` (Frontend + Shared + Worker) | **PASS (exit 0)** |

---

## 2. Đối chiếu 4,500 Trận Classic Simulation (`node test/boardgame-sim.cjs`)

Chạy trực tiếp `node test/boardgame-sim.cjs` trên HEAD Phase 7 cho kết quả **trùng khớp tuyệt đối đến từng chữ số thập phân** với baseline trước Phase 7 (`e3dfeac`):

| Chỉ số Classic (4,500 trận: `900 × 5` từ `4P–8P`) | Baseline trước Phase 7 (`e3dfeac`) | Sau Phase 7 (`starter-fifty-six` · 66/66) | Sai lệch (Delta) |
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

## 3. Lệnh Tái lập Kiểm chứng Classic

```bash
git diff --stat e3dfeac..HEAD -- features/boardgame/domain/victory.ts
node test/boardgame-engine.test.cjs
node test/boardgame-expansion-foundation.test.cjs
node test/boardgame-sim.cjs
node test/boardgame-phase7d-integration.test.cjs
```

## 4. Kết luận Nghiệm thu Classic

Toàn bộ cổng bảo vệ Classic đạt **0.00% hồi quy** về RNG, luật chơi, điều kiện thắng, DTO bảo mật, lưu trữ SQLite Durable Object và định tuyến production. Chế độ `classic` trên production tiếp tục vận hành hoàn toàn độc lập và an toàn bên cạnh bộ mở rộng 66 nhân vật ở nhánh thử nghiệm nội bộ.
