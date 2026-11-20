# Bóng Đêm KTX — Phase 2 Classic Zero-Regression Report

> **Kết luận:** **ZERO REGRESSION (0.00% sai lệch).** Sau khi hoàn tất toàn bộ Phase 2A, 2B và 2C (8 tướng Starter Eight, Pending Choice, Continuation Queue, DO Alarm/Hibernation, UI/VFX và 10,000-match simulation), toàn bộ hành vi của chế độ **Classic (`classic`)** — từ PRNG Mulberry32, phân vai 4–8 người, 48 lá bài, 10 nhân vật gốc, điều kiện thắng, đến bảo mật P0, reconnect và E2E — **trùng khớp 100.00% bit-for-bit** với baseline trước Phase 1 (`ce3b8c7`) và sau Phase 1 (`01cf47c`).

---

## 1. Kiến trúc Cách ly Classic (Classic Isolation Invariants)

1. **Đường thực thi riêng biệt (`isExpandedRuleset(state)`):**
   - Trong `actions.ts` và `state-machine.ts`, khi `state.rulesetId === 'classic'` (hoặc `undefined` trên state cũ trước Phase 1):
     - `state.pendingChoice` và `state.expansionState` **không bao giờ được khởi tạo**.
     - `DRAW_CARD`, `USE_LOC_POWER`, `USE_CARD`, `INVESTIGATE_CARD`, `ATTACK`, `USE_SKILL` đi thẳng qua các hàm Classic gốc trong `effects.ts` (`resolveDrawLocationCard`, `resolveLocationPower`, `resolveUseCard`, `resolveInvestigateCard`, `resolveAttack`, `resolveUseSkill`).
     - `VictoryEngine.evaluate(state)` uỷ quyền trực tiếp về `evaluateVictory(state)` của Classic.
2. **Bảo toàn 100% Hằng số & Schema Classic:**
   - `BOARD_GAME_RULESET_VERSION = 4`, `BOARD_GAME_PROTOCOL_VERSION = 1`.
   - `ROLES_CATALOG` giữ nguyên đúng **10 nhân vật Classic**; `CARDS_CATALOG` giữ nguyên đúng **48 lá bài** (16 Khám Phá · 16 Cung Ứng · 16 Đột Kích).
   - `eq_mirror` & `eq_chocolate` giữ nguyên 100% điều kiện trên Classic (`state.rulesetId === 'classic'`).
   - Dữ liệu SQLite live v4 cũ không có `rulesetId` / `catalogVersion` / `pendingChoice` / `expansionState` tải lại và chơi tiếp hoàn toàn mượt (`test C3`).
3. **Khóa cứng Production (`worker/wrangler.toml` & `DEFAULT_RULESET_REGISTRY`):**
   - Production chỉ liệt kê 4 ruleset chuẩn (`classic` Available; `expansion-1`, `expansion-2`, `full-expansion` Coming Soon / Disabled).
   - Cả `starter-four`, `starter-eight` lẫn 3 gói expansion lớn đều bị server từ chối `HTTP 400 / RULESET_UNAVAILABLE` trên mọi cấu hình không đặt biến môi trường nội bộ `ALLOW_EXPERIMENTAL_RULESETS=1`.

---

## 2. Kiểm chứng Bit-for-Bit Classic RNG (25 Baseline SHA-256 Snapshots)

Bài kiểm tra `B1` trong `test/boardgame-expansion-foundation.test.cjs` đối chiếu trực tiếp 25 tổ hợp `4P–8P × [1, 42, 1337, 202611, 999999]` (`rngState`, `roleId[]`, `location[]`, `clusterPairs`, 5 lá đầu mỗi bộ bài) với 25 mã SHA-256 ghi nhận trên commit gốc `ce3b8c7`:

- **Kết quả sau Phase 2C:** **25 / 25 SHA-256 fingerprints khớp tuyệt đối 100.00%.**

---

## 3. Đối chiếu 4,500 Trận Classic Simulation (Pre-Phase 1 vs Post-Phase 1 vs Post-Phase 2C)

| Chỉ số (`node test/boardgame-sim.cjs`) | Pre-Phase 1 (`ce3b8c7`) | Post-Phase 1 (`01cf47c`) | **Post-Phase 2C** | Sai lệch |
|---|---:|---:|---:|---:|
| `totalGames` | 4,500 | 4,500 | **4,500** | **0** |
| `stalledGames` / `draws` / `botAccessViolations` | `0 / 0 / 0` | `0 / 0 / 0` | **`0 / 0 / 0`** | **0** |
| `avgRounds` / `avgTurns` | `7.34 / 32.36` | `7.34 / 32.36` | **`7.34 / 32.36`** | **0.00** |
| `earlyEndRounds1To2Pct` / `round1PlayerDeathRatePct` | `2.02% / 0.448%` | `2.02% / 0.448%` | **`2.02% / 0.448%`** | **0.00%** |
| `lanternGuardPct` / `mistOrderPct` / `wandererPrimaryPct` | `39.73% / 45.56% / 14.71%` | `39.73% / 45.56% / 14.71%` | **`39.73% / 45.56% / 14.71%`** | **0.00%** |
| `wanderer5to8WinRatePct` | `35.83%` | `35.83%` | **`35.83%`** | **0.00%** |
| `avgActionsPerGame` (roll / draw / attack / skill / reveal) | `36.11 / 23.87 / 18.75 / 2.67 / 3.84` | `36.11 / 23.87 / 18.75 / 2.67 / 3.84` | **`36.11 / 23.87 / 18.75 / 2.67 / 3.84`** | **0.00** |
| `gac-ky-thuat` (app / win / surv / rev) | `3276 / 40.54% / 45.73% / 99.21%` | `3276 / 40.54% / 45.73% / 99.21%` | **`3276 / 40.54% / 45.73% / 99.21%`** | **0.00%** |
| `suong-gac-cong` (app / win / surv / rev) | `3308 / 46.80% / 37.27% / 99.18%` | `3308 / 46.80% / 37.27% / 99.18%` | **`3308 / 46.80% / 37.27% / 99.18%`** | **0.00%** |
| `lang-tien-phong` (app / win / surv / rev) | `1816 / 42.02% / 60.46% / 99.94%` | `1816 / 42.02% / 60.46% / 99.94%` | **`1816 / 42.02% / 60.46% / 99.94%`** | **0.00%** |

---

## 4. Kiểm chứng Hồi quy Classic Multiplayer, VFX & Browser E2E

- **Unit & DO Tests Classic:** `boardgame-engine.test.cjs` (10/10 PASS), `boardgame-lounge.test.cjs` (PASS), `boardgame-lobby-do.test.cjs` (PASS), `boardgame-match-do.test.cjs` (PASS), `boardgame-vfx.test.cjs` (25/25 PASS).
- **Cách ly Song song Classic + Starter Eight (`P2C-2`):** Trận Classic (Bàn 1) và trận Starter Eight (Bàn 2) chạy đồng thời trên cùng Worker DO không ảnh hưởng lẫn nhau; trận Classic chỉ phân vai trong 10 tướng gốc.
- **Playwright Browser E2E (`e2e-05-06`):** Chạy thật trên Google Chrome headless với `out/` sau `next build`: 2-match concurrent isolation + 4/4 WebSocket security probes **PASS**.
