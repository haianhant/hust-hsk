# Bóng Đêm KTX — Phase 5 Classic Zero-Regression Report

> **Kết luận:** **ZERO REGRESSION (0.00% sai lệch).** Sau khi hoàn tất toàn bộ **Phase 5A–5E** (`CAP-04` HealPipeline, `CAP-05` Private ReactionPolicy & Unicast Sync, `CAP-06` Bounded Safe Reaction Chains, `CAP-07` Extended Neutral Victory Primitives, `CAP-10` Canonical Card Sets, 4 tướng Tier-2 cuối, 8 tướng Tier-3, 12 chân dung Anime Noir WebP nâng tổng lên **48/48**, `22` loại Pending Choice, `starter-thirty-eight` **48 tướng**, real DO 4P–8P E2E và 20,000-match simulation), toàn bộ chế độ **Classic (`classic`)** — PRNG Mulberry32, phân vai 4–8 người, 48 lá bài, 10 vai gốc, điều kiện thắng, `eq_chocolate`, bảo mật P0, reconnect và browser E2E — **khớp 100.00% bit-for-bit** với baseline trước Phase 1 (`ce3b8c7`) và qua tất cả các đợt Phase 1–4 (`01cf47c`, `20d618f`, `098b29d`, `9e498cd`).

---

## 1. Kiến trúc Cách ly Classic (Unchanged Invariants)

1. **`features/boardgame/domain/victory.ts` nguyên vẹn 100%:**
   - Lệnh `git diff --stat features/boardgame/domain/victory.ts` trả về **trống hoàn toàn (`0` dòng thay đổi)** xuyên suốt toàn bộ Phase 0 → Phase 5E.
   - Toàn bộ điều kiện thắng mới của `Arlene`, `Angel`, `Bianca`, `Dalton` (cùng `Cindy`, `Bipolar`, `Cruz`, `Bryon`) nằm hoàn toàn trong `victory-engine.ts` (`evaluateExpandedVictory`) và chỉ chạy khi `isExpandedRuleset(state) === true`.
2. **Đường thực thi Classic tách biệt tuyệt đối (`isExpandedRuleset(state)`):**
   - Khi `state.rulesetId === 'classic'` (hoặc `undefined` trên snapshot SQLite cũ): `HealPipeline`, `reactionPolicyByPlayer`, `angelAuras`, `daltonActivatedByPlayer`, `umibozuTriggeredIds`, `pendingChoice`, `ROLE_REVEALED_TRIGGERS`, `GWENDOLEN_COUNTER`, `FREYJA_EXTRA_ATTACK_CHECK` và toàn bộ **38 expansion handlers** **không bao giờ thực thi**.
   - `SET_REACTION_PREF` bị từ chối rõ ràng trong `classic` và bộ điều khiển phản ứng riêng tư trên `ActionPanel.tsx` hoàn toàn ẩn khỏi giao diện Classic.
   - `ROLES_CATALOG` giữ nguyên **10 vai Classic**; `CARDS_CATALOG` giữ nguyên **48 lá bài** (`16 × 3`); 10 chân dung Classic trong `MIDNIGHT_CHARACTER_ART` giữ nguyên byte-for-byte.
3. **Production Ruleset Safety:**
   - `DEFAULT_RULESET_REGISTRY.listRulesets()` chỉ trả 4 ruleset chuẩn với duy nhất `classic` có `enabledInProduction: true`.
   - Toàn bộ các ruleset thử nghiệm và chưa hoàn thiện (`starter-four`, `starter-eight`, `starter-sixteen`, `starter-twenty-six`, `starter-thirty-eight`, `expansion-1`, `expansion-2`, `full-expansion`) đều bị Cloudflare DO production từ chối với **`HTTP 400 / RULESET_UNAVAILABLE`** (`P5C-1`, `P5D-5`, `P5E-2`).

---

## 2. Kiểm chứng Bit-for-Bit Classic RNG (25 Baseline SHA-256 Fingerprints)

- Bài test `B1` (`test/boardgame-expansion-foundation.test.cjs`) kiểm tra toàn bộ 25 tổ hợp `4P–8P × [1, 42, 1337, 202611, 999999]`:
- **Kết quả sau Phase 5E:** **25 / 25 SHA-256 fingerprints khớp 100.00%.**

---

## 3. Đối chiếu 4,500 Trận Classic Simulation (`ce3b8c7` → `098b29d` → `9e498cd` → Phase 5E)

| Chỉ số (`node test/boardgame-sim.cjs`) | Pre-Phase 1 (`ce3b8c7`) | Post-Phase 4 (`9e498cd`) | **Post-Phase 5E** | Sai lệch |
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
- **Concurrent Classic + Starter Thirty-Eight (`P5E-2`):** Hai phòng chạy song song trên cùng Cloudflare Worker; bàn Classic chỉ chia 10 vai gốc và không nhận bất kỳ trường mở rộng nào (`usurperAuraActive === undefined`, `angelProtectedPlayerIds === undefined`).
- **Visual & Browser E2E:** `boardgame-visual-prototype.cjs` (`CLS=0`, `webglContexts=0`, `54.7–59.0 FPS`, `0px` overflow) và `boardgame-e2e.cjs --shard=e2e-05-06` (2-match concurrent isolation + 4/4 WS security probes) — **100% PASS**.
