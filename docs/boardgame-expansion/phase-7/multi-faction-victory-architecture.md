# Kiến trúc `MultiFactionVictory` (Phase 7A — Cain & Đồng Thắng Đa Phe)

> **Module Chính:** [`features/boardgame/domain/victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts)  
> **Hợp đồng Mạng:** [`shared/contracts/boardgame.ts`](../../../shared/contracts/boardgame.ts)  
> **Bất biến Classic:** [`features/boardgame/domain/victory.ts`](../../../features/boardgame/domain/victory.ts) giữ nguyên **0 dòng thay đổi** (`git diff victory.ts === empty`).

---

## 1. Biểu diễn Giao thức Tương thích Ngược

Thay vì ép chiến thắng đồng thời của cả Đội Săn Đêm (Hunter) và Hội Bóng Đêm (Shadow) thành một phe duy nhất tùy tiện, chế độ mở rộng mở rộng hợp đồng theo hướng tương thích ngược hoàn toàn với Classic:

- `winnerFaction: BoardGameWinnerFaction | null` bổ sung giá trị tường minh **`'multi-faction'`**.
- Bổ sung trường tùy chọn **`winningFactions?: readonly BoardGameFactionId[]`** trên `VictoryEvaluation`, `AuthoritativeGameState` và `BoardGamePublicGameView`:
  - **Classic (`rulesetId === 'classic'`):** `winningFactions` không xuất hiện (`undefined`), `winnerFaction` giữ nguyên tập giá trị Classic cũ (`'lantern-guard' | 'mist-order' | 'wanderer-solo' | 'wanderer' | null`).
  - **Expanded — Thắng đơn phe:** `winningFactions: ['lantern-guard']` hoặc `['mist-order']` hoặc `['wanderer']`.
  - **Expanded — Đồng thắng song phe (Cain hoặc đòn đồng quy):** `winnerFaction: 'multi-faction'`, `winningFactions: ['lantern-guard', 'mist-order']`.

---

## 2. Ma trận Các Chế độ Chiến thắng Đã Hỗ trợ

| # | Loại chiến thắng | Nguồn kích hoạt | `winnerFaction` | `winningFactions` | Tập `winnerPlayerIds` |
|---:|---|---|---|---|---|
| 1 | Hunter Primary | Toàn bộ `effectiveShadow` bị loại vĩnh viễn (`shadowsAlive === 0`, trừ `DORMANT_PENDING_REVIVE`) | `'lantern-guard'` | `['lantern-guard']` | Hunters + solo đồng thời + Wanderers đạt điều kiện + `CopiedVictoryGraph` |
| 2 | Shadow Primary | Toàn bộ `effectiveHunter` bị loại HOẶC ≥ 3 `effectiveNeutral` bị loại vĩnh viễn | `'mist-order'` | `['mist-order']` | Effective Shadows (gồm Bonnie sau chuyển phe) + solo đồng thời + Wanderers + `CopiedVictoryGraph` |
| 3 | **Simultaneous Multi-Faction (Cain / Đồng quy)** | Người chơi trong `cainDeathVictoryModifierIds` bị loại vĩnh viễn, HOẶC cả Hunter và Shadow cùng thỏa điều kiện trong 1 lô | **`'multi-faction'`** | **`['lantern-guard', 'mist-order']`** | **Toàn bộ Hunter + Toàn bộ effective Shadow** + solo đồng thời + Wanderers thỏa bất kỳ phe thắng nào + `CopiedVictoryGraph` |
| 4 | Neutral Solo / Cain Personal / N.C. Soldier Alliance | `Bob`, `Charles`, `Daniel`, `Cindy`, `Cruz`, `Arlene`, `Dalton`, `Colt`, `April & Skipps`, `Cain` (5P / 6P–8P), Liên minh `N.C. Soldier`, `COPY_GOAL` tức thì | `'wanderer-solo'` | `['wanderer']` | Mọi ứng viên tức thì đồng thời + toàn bộ thành viên Liên minh đạt chuẩn + Wanderers đồng thắng + `CopiedVictoryGraph` |
| 5 | Safety `maxRounds` | `state.round > state.maxRounds` | `topFaction` | `[topFaction]` | Phe ưu thế sinh tồn + Wanderers đạt chuẩn + `CopiedVictoryGraph` |

---

## 3. Tương tác với `CopiedVictoryGraph`, `PendingResurrection` & Đồng Thời Trong 1 Lô

1. **Tương thích `CopiedVictoryGraph` (`Antimony`, `Cassie`, `Clairvoyant`, `Bethany`, `Diana`, `Aaron`):**
   - `evaluateDirectRoleGoalForSubject` nhận danh sách `resolvedWinningFactions`, vì vậy khi `winningFactions = ['lantern-guard', 'mist-order']`, cả `huntersWon` và `shadowsWon` đều bằng `true` (đánh giá chính xác `Daniel`, `Bipolar`, `Antimony` sao chép Hunter/Shadow, `Bonnie`, v.v.).
2. **Thu thập Đồng thời trong 1 Lô Sự kiện:**
   - Mọi điều kiện thắng tức thì (`soloTriggers`, `allianceWinnerPlayers`, `copiedImmediateWinners`) được tính **trước** khi rẽ nhánh trả về, nên nếu cùng 1 hành động vừa hoàn thành điều kiện cá nhân (vd. Cain 5P hạ gục Hunter cuối cùng) vừa kích hoạt thắng phe, **cả hai** đều được gộp xác định vào `winnerSet` theo thứ tự `state.turnOrder`!
3. **Loại trừ Ngủ đông (`PendingResurrection`):**
   - `cainDeathVictoryModifierIds` chỉ kích hoạt khi người sở hữu đạt `isPlayerFinallyEliminated(state, p) === true` (không kích hoạt nếu người sao chép Cain có cả Undead dormancy và mới vào trạng thái ngủ đông).
