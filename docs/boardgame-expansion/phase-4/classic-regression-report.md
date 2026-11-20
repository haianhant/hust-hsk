# Bóng Đêm KTX — Phase 4 Classic Zero-Regression Report

> **Kết luận:** **ZERO REGRESSION (0.00% sai lệch).** Sau khi hoàn tất toàn bộ Phase 4A, 4B, 4C và 4D (5 nền tảng engine dùng chung, 10 tướng Wave 3 Tier-2, 10 chân dung Anime Noir WebP nâng tổng lên 36/36, 6 Pending Choices mới nâng tổng lên 15 loại, `starter-twenty-six` 36 tướng, real DO 4P–8P E2E và 15,000-match simulation), toàn bộ chế độ **Classic (`classic`)** — PRNG Mulberry32, phân vai 4–8 người, 48 lá bài, 10 vai gốc, điều kiện thắng, `eq_chocolate`, bảo mật P0, reconnect và browser E2E — **khớp 100.00% bit-for-bit** với baseline trước Phase 1 (`ce3b8c7`), sau Phase 1 (`01cf47c`), sau Phase 2 (`20d618f`) và sau Phase 3 (`098b29d`).

---

## 1. Kiến trúc Cách ly Classic (Unchanged Invariants)

1. **`features/boardgame/domain/victory.ts` nguyên vẹn 100%:** `git diff features/boardgame/domain/victory.ts` trống hoàn toàn — không chỉnh sửa bất kỳ dòng mã nào của bộ đánh giá chiến thắng Classic. Điều kiện thắng của `Cruz` và `Bryon` nằm hoàn toàn trong `victory-engine.ts` (`evaluateExpandedVictory`) và chỉ chạy khi `isExpandedRuleset(state) === true`.
2. **Đường thực thi Classic tách biệt (`isExpandedRuleset(state)`):**
   - Khi `state.rulesetId === 'classic'` (hoặc `undefined` trên snapshot SQLite cũ): `state.pendingChoice`, `state.expansionState`, `triggerExpandedTurnStart`, `isUdiProtectedFromAttack`, `visionsMarks`, `cruzQualifyingCardTurnByPlayer` và toàn bộ 26 expansion handlers **không bao giờ thực thi**.
   - `eq_chocolate` (`eq-14`) kiểm tra nhánh Classic gốc (`lang-quan-sat`, `gac-truc-ban`, `suong-tin-gia`) khi `!isExpandedMode`, chỉ đọc động `sourceName` từ registry khi `isExpandedMode === true`.
   - `ROLES_CATALOG` giữ nguyên **10 vai Classic**; `CARDS_CATALOG` giữ nguyên **48 lá bài** (`16 × 3`); 10 ảnh chân dung Classic trong `MIDNIGHT_CHARACTER_ART` giữ nguyên byte-for-byte.
3. **Production Ruleset Safety:**
   - `DEFAULT_RULESET_REGISTRY.listRulesets()` chỉ trả 4 ruleset chuẩn với duy nhất `classic` có `enabledInProduction: true`.
   - Toàn bộ 7 bộ luật mở rộng (`starter-four`, `starter-eight`, `starter-sixteen`, `starter-twenty-six`, `expansion-1`, `expansion-2`, `full-expansion`) đều bị server Cloudflare DO từ chối `HTTP 400 / RULESET_UNAVAILABLE` trên mọi cấu hình production (`ALLOW_EXPERIMENTAL_RULESETS` không bật).

---

## 2. Kiểm chứng Bit-for-Bit Classic RNG (25 Baseline SHA-256 Fingerprints)

- Bài test `B1` (`test/boardgame-expansion-foundation.test.cjs`) kiểm tra toàn bộ 25 tổ hợp `4P–8P × [1, 42, 1337, 202611, 999999]`:
- **Kết quả sau Phase 4D:** **25 / 25 SHA-256 fingerprints khớp 100.00%.**

---

## 3. Đối chiếu 4,500 Trận Classic Simulation (`ce3b8c7` → `20d618f` → `098b29d` → Phase 4D)

| Chỉ số (`node test/boardgame-sim.cjs`) | Pre-Phase 1 (`ce3b8c7`) | Post-Phase 3C (`098b29d`) | **Post-Phase 4D** | Sai lệch |
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

- **Classic DO & Engine Tests:** `boardgame-engine.test.cjs` (10/10), `boardgame-lounge.test.cjs` (6/6), `boardgame-lobby-do.test.cjs` (4/4), `boardgame-match-do.test.cjs` (6/6), `boardgame-vfx.test.cjs` (25/25) — **100% PASS**.
- **Concurrent Classic + Starter Twenty-Six (`P4D-3`):** Hai bàn chạy song song trên cùng Worker DO; bàn Classic chỉ chia 10 tướng gốc, hoàn toàn miễn nhiễm với hibernation/alarm và trạng thái `expansionState` của bàn `starter-twenty-six`.
- **Visual & Browser E2E:** `boardgame-visual-prototype.cjs` (83/83 decoded WebP, `CLS=0`, `0px` overflow) và `boardgame-e2e.cjs --shard=e2e-05-06` (2-match concurrent isolation + 4/4 WS security probes) — **100% PASS**.
