# Bóng Đêm KTX — Phase 1 Classic Regression Report

> **Kết luận tổng quan:** **KHÔNG CÓ BẤT KỲ REGRESSION NÀO ĐỐI VỚI CLASSIC (ZERO REGRESSION).** Toàn bộ RNG, phân bổ vai, luật kỹ năng, sát thương, điều kiện thắng, tần suất thẻ bài, bảo mật P0, reconnect/F5 và E2E của bản Classic trùng khớp **100.00% bit-for-bit** so với commit baseline trước Phase 1 (`ce3b8c7` / `decb352`).

---

## 1. Kiểm chứng Bit-for-Bit Classic RNG (25 Baseline Snapshots)

Trước khi chỉnh sửa `features/boardgame/domain/state-machine.ts`, hệ thống đã trích xuất trực tiếp 25 snapshot đầu ra của `createInitialGameState` trên commit `ce3b8c7` (tổ hợp `4P, 5P, 6P, 7P, 8P` × 5 seeds `[1, 42, 1337, 202611, 999999]`), kiểm tra cùng lúc:
- `rngState` sau khởi tạo
- Mảng `roleId` gán cho từng ghế
- Vị trí khởi đầu `location` của từng người chơi
- 3 cặp `clusterPairs` sau khi xáo ngẫu nhiên
- 5 lá đầu của cả 3 bộ bài (`investigation`, `equipment`, `event`)

Sau refactor Phase 1 (`test B1` trong `test/boardgame-expansion-foundation.test.cjs`):
- **Kết quả:** **25/25 SHA-256 fingerprints khớp tuyệt đối 100%**. Không một bit nào trong thứ tự tiêu thụ PRNG Mulberry32 bị thay đổi.

---

## 2. Đối chiếu Simulation 4,500 Trận Classic (Before vs After Phase 1)

| Chỉ số Simulation (`node test/boardgame-sim.cjs`) | Baseline Pre-Phase 1 (`ce3b8c7`) | Post-Phase 1 | Sai lệch |
|---|---:|---:|---:|
| `totalGames` | 4,500 | 4,500 | **0** |
| `stalledGames` / `draws` / `botAccessViolations` | 0 / 0 / 0 | 0 / 0 / 0 | **0** |
| `avgRounds` / `avgTurns` | `7.34` / `32.36` | `7.34` / `32.36` | **0.00** |
| `lanternGuardPct` / `mistOrderPct` / `wandererPrimaryPct` | `39.73%` / `45.56%` / `14.71%` | `39.73%` / `45.56%` / `14.71%` | **0.00%** |
| `wanderer5to8WinRatePct` | `35.83%` | `35.83%` | **0.00%** |
| `avgActionsPerGame` (roll / draw / attack / skill / reveal) | `36.11 / 23.87 / 18.75 / 2.67 / 3.84` | `36.11 / 23.87 / 18.75 / 2.67 / 3.84` | **0.00** |
| `gac-ky-thuat` (appearances / winRate / survival / reveal) | `3276 / 40.54% / 45.73% / 99.21%` | `3276 / 40.54% / 45.73% / 99.21%` | **0.00%** |
| `lang-tien-phong` (appearances / winRate / survival / reveal) | `1816 / 42.02% / 60.46% / 99.94%` | `1816 / 42.02% / 60.46% / 99.94%` | **0.00%** |

---

## 3. Kiểm tra Các File Logic Classic Không Bị Sửa Đổi Hành Vi

Các file gameplay cốt lõi sau của Classic **không bị thay đổi bất kỳ dòng logic tính toán nào trong Phase 1**:
- `features/boardgame/domain/roles.ts` — **0 dòng thay đổi**
- `features/boardgame/domain/cards.ts` — **0 dòng thay đổi**
- `features/boardgame/domain/rules.ts` — **0 dòng thay đổi**
- `features/boardgame/domain/actions.ts` — **0 dòng thay đổi**
- `features/boardgame/domain/effects.ts` — **0 dòng thay đổi**
- `features/boardgame/domain/victory.ts` — **0 dòng thay đổi**
- `features/boardgame/ui/GameBoard.tsx` — **0 dòng thay đổi** (Desktop Tactical Board V2 nguyên vẹn)

---

## 4. Kiểm chứng Bảo mật P0, Reconnect & E2E Classic

- **Spectator P0 Isolation:** Đã xác minh trên cả DO unit tests (`boardgame-match-do.test.cjs`, `boardgame-expansion-foundation.test.cjs` test `C1`) và Playwright E2E `e2e-02`: `privateView === null` và không rò rỉ `hp`, `maxHp`, `roleId` ẩn, `privateClues`.
- **F5 Reconnect & Hibernation:** Đã xác minh trên cả `e2e-03` (5 checkpoint reload), `boardgame-match-do.test.cjs` (hibernation + reconnect), và `C1`/`C3` (tải lại state v4 trước Phase 1 mà không làm hỏng trận đang diễn ra).
- **Zero Unimplemented Expansion Execution:** `DEFAULT_RULESET_REGISTRY` chặn tuyệt đối `expansion-1`, `expansion-2`, `full-expansion` tại HTTP router, WebSocket DO và `createInitialGameState`; tất cả 56 tướng mở rộng có `skillImpl = null` và `victoryImpl = null`.
