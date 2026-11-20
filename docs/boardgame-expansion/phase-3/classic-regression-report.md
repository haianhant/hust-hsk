# Bóng Đêm KTX — Phase 3 Classic Zero-Regression Report

> **Kết luận:** **ZERO REGRESSION (0.00% sai lệch).** Sau khi hoàn tất toàn bộ Phase 3A, 3B và 3C (8 tướng Wave 2, 8 chân dung Anime Noir, `LocationAlias`, pipeline 9 bước, hàng đợi rút 2 thẻ Gloria, chiến thắng Neutral cho Cindy & Bipolar, `starter-sixteen` 26 tướng và 10,000-match simulation), toàn bộ chế độ **Classic (`classic`)** — PRNG Mulberry32, phân vai 4–8 người, 48 lá bài, 10 vai gốc, điều kiện thắng, bảo mật P0, reconnect và E2E — **khớp 100.00% bit-for-bit** với baseline trước Phase 1 (`ce3b8c7`), sau Phase 1 (`01cf47c`) và sau Phase 2 (`20d618f`).

---

## 1. Kiến trúc Cách ly Classic (Unchanged Invariants)

1. **`features/boardgame/domain/victory.ts` nguyên vẹn 100%:** Logic thắng Classic không chỉnh sửa một dòng nào; điều kiện thắng mới cho `Cindy` và `Bipolar` nằm hoàn toàn trong `evaluateExpandedVictory` của `victory-engine.ts` và chỉ chạy khi `isExpandedRuleset(state) === true`.
2. **Đường thực thi Classic tách biệt (`isExpandedRuleset(state)`):**
   - Khi `state.rulesetId === 'classic'` (hoặc `undefined` trên dữ liệu SQLite cũ): `state.pendingChoice`, `state.expansionState`, `triggerExpandedTurnStart`, `gloriaQueuedCards` và toàn bộ 16 expansion handlers **không bao giờ thực thi**.
   - `ROLES_CATALOG` giữ nguyên **10 vai Classic**; `CARDS_CATALOG` giữ nguyên **48 lá bài** (16×3); 10 ảnh chân dung Classic trong `MIDNIGHT_CHARACTER_ART` giữ nguyên byte-for-byte.
3. **Production Ruleset Safety:**
   - `DEFAULT_RULESET_REGISTRY.listRulesets()` chỉ trả 4 ruleset chuẩn với duy nhất `classic` có `enabledInProduction: true`.
   - `starter-four`, `starter-eight`, `starter-sixteen`, `expansion-1`, `expansion-2`, `full-expansion` đều bị server DO từ chối `HTTP 400 / RULESET_UNAVAILABLE` trên mọi cấu hình production (`ALLOW_EXPERIMENTAL_RULESETS` không bật).

---

## 2. Kiểm chứng Bit-for-Bit Classic RNG (25 Baseline SHA-256 Fingerprints)

- Bài test `B1` (`test/boardgame-expansion-foundation.test.cjs`) kiểm tra toàn bộ 25 tổ hợp `4P–8P × [1, 42, 1337, 202611, 999999]`:
- **Kết quả sau Phase 3C:** **25 / 25 SHA-256 fingerprints khớp 100.00%.**

---

## 3. Đối chiếu 4,500 Trận Classic Simulation (Pre-Phase 1 → Phase 1 → Phase 2C → Phase 3C)

| Chỉ số (`node test/boardgame-sim.cjs`) | Pre-Phase 1 (`ce3b8c7`) | Post-Phase 2C (`20d618f`) | **Post-Phase 3C** | Sai lệch |
|---|---:|---:|---:|---:|
| `totalGames` | 4,500 | 4,500 | **4,500** | **0** |
| `stalledGames` / `draws` / `botAccessViolations` | `0 / 0 / 0` | `0 / 0 / 0` | **`0 / 0 / 0`** | **0** |
| `avgRounds` / `avgTurns` | `7.34 / 32.36` | `7.34 / 32.36` | **`7.34 / 32.36`** | **0.00** |
| `earlyEndRounds1To2Pct` / `round1PlayerDeathRatePct` | `2.02% / 0.448%` | `2.02% / 0.448%` | **`2.02% / 0.448%`** | **0.00%** |
| `lanternGuardPct` / `mistOrderPct` / `wandererPrimaryPct` | `39.73% / 45.56% / 14.71%` | `39.73% / 45.56% / 14.71%` | **`39.73% / 45.56% / 14.71%`** | **0.00%** |
| `wanderer5to8WinRatePct` | `35.83%` | `35.83%` | **`35.83%`** | **0.00%** |
| `avgActionsPerGame` (roll / draw / attack / skill / reveal) | `36.11 / 23.87 / 18.75 / 2.67 / 3.84` | `36.11 / 23.87 / 18.75 / 2.67 / 3.84` | **`36.11 / 23.87 / 18.75 / 2.67 / 3.84`** | **0.00** |
| `gac-ky-thuat` (win / surv) | `40.54% / 45.73%` | `40.54% / 45.73%` | **`40.54% / 45.73%`** | **0.00%** |
| `suong-gac-cong` (win / surv) | `46.80% / 37.27%` | `46.80% / 37.27%` | **`46.80% / 37.27%`** | **0.00%** |
| `lang-tien-phong` (win / surv) | `42.02% / 60.46%` | `42.02% / 60.46%` | **`42.02% / 60.46%`** | **0.00%** |

---

## 4. Hồi quy Multiplayer, Visual Prototype & Browser E2E Classic

- **Classic DO & Engine Tests:** `boardgame-engine.test.cjs` (10/10), `boardgame-lounge.test.cjs`, `boardgame-lobby-do.test.cjs`, `boardgame-match-do.test.cjs`, `boardgame-vfx.test.cjs` (25/25) — **100% PASS**.
- **Concurrent Classic + Starter Sixteen (`P3C-3`):** Hai bàn chạy đồng thời trên cùng Worker DO, bàn Classic chỉ phân vai trong 10 tướng gốc và không chịu ảnh hưởng từ hibernation/alarm của bàn `starter-sixteen`.
- **Visual & Browser E2E:** `boardgame-visual-prototype.cjs` (73/73 decoded WebP, `CLS=0`, `0px` overflow) và `boardgame-e2e.cjs --shard=e2e-05-06` (2-match isolation + 4/4 WS security probes) — **100% PASS**.
