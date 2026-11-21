# Phase 7B — Báo cáo Triển khai 8 Nhân vật Tier-4 Cuối cùng & Ruleset `starter-fifty-six` (66/66)

> **Milestone:** Phase 7B — Character Implementation Wave 6 (Tier-4 Completion)  
> **Catalog Version:** `2026.11-p7b`  
> **Trạng thái Production:** Khóa cứng **`classic`-only** (`starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion` đều có `enabledInProduction: false`, trạng thái tách biệt `IMPLEMENTED` / `INTERNAL_VALIDATED` — **CHƯA** `PUBLIC_RELEASE_APPROVED`).

---

## 1. Tổng quan Hoàn thiện Catalog 66/66

Phase 7B hoàn tất toàn bộ **8 nhân vật Tier-4 cuối cùng**, nâng tổng số nhân vật khả dụng trong experimental ruleset **`starter-fifty-six`** lên **66/66 nhân vật**:

| Phân nhóm | Số lượng | Cơ cấu Phe |
|---|---:|---|
| Classic (Base — giữ nguyên 100%) | 10 | 3 Hunter · 3 Shadow · 4 Neutral |
| Expansion 1 (26/26 — hoàn thiện 100%) | 26 | 8 Hunter · 9 Shadow · 9 Neutral |
| Expansion 2 (30/30 — hoàn thiện 100%) | 30 | 9 Hunter · 9 Shadow · 12 Neutral |
| **Tổng cộng (`starter-fifty-six` / `full-expansion`)** | **66** | **20 Hunter · 21 Shadow · 25 Neutral** |

---

## 2. Chi tiết 8 Nhân vật Tier-4 đã Triển khai

Tất cả 8 nhân vật sử dụng chính xác HP & phe chính tắc từ [`docs/boardgame-expansion/character-catalog.json`](../character-catalog.json) và quy tắc đã phê duyệt tại [`docs/boardgame-expansion/phase-7/rules-decisions.md`](./rules-decisions.md) (`rulesStatus: "house-rule-approved"`, `implementationStatus: "implemented"`, `activeInGameplay: false`):

| # | Role ID | Tên | Gói | Phe | HP | Primitive cốt lõi & Hành vi Server-Authoritative |
|---:|---|---|---|---|---:|---|
| 1 | `exp1_lloyd` | **Lloyd** | `expansion-1` | `lantern-guard` | **12** | `GlobalAttackInterrupt`: chỉ kích hoạt khi đã lộ diện; chụp trạng thái đòn đánh trước khi đổ xúc xắc (`startExpandedAttack` → `openNextLloydInterruptOrProceed`), hy sinh **2 HP** (được phép hy sinh HP cuối cùng) để hủy toàn bộ đòn đánh (bao gồm cả Machine Gun AoE trong 1 hành động), tiêu thụ **0 RNG** khi hủy. |
| 2 | `exp1_vengeful_spirit` | **Vengeful Spirit** | `expansion-1` | `mist-order` | **13** | `DynamicSkillCopy`: nhận `PendingChoice` kín (`choice-secret-*`, không lộ danh tính qua public/opponent/spectator view) khi người khác bị loại vĩnh viễn (`FINAL_ELIMINATED`; bỏ qua Undead ngủ đông). Bỏ qua giữ nguyên 1 lần/trận; đồng ý thì lộ diện và sao chép kỹ năng với **trạng thái sử dụng mới tinh** (`binding.skillUsedOnce = false`). Hỗ trợ lô AoE nhiều nạn nhân. |
| 3 | `exp1_voodoo` | **Voodoo** | `expansion-1` | `mist-order` | **13** | `TurnOwnershipOverride`: kích hoạt đầu lượt (`ROLL_MOVE`) chọn mục tiêu chiếm quyền lượt kế tiếp (1 lần/trận). Voodoo điều khiển các hành động công khai của nạn nhân (`ROLL_DICE`, `CHOOSE_DEST`, `DRAW_CARD`, `USE_LOC_POWER`, `SKIP_LOC`, `EQUIP_CARD`, `USE_CARD`, `ATTACK`, `END_TURN`); nạn nhân bị khóa lệnh công khai; Voodoo bị cấm `REVEAL_ROLE`, `USE_SKILL`, `TRANSFER_TO_BETHANY`, `INVESTIGATE_CARD` và không bao giờ xem được bài kín của nạn nhân. Rút lá `inv-*` tự động tạm dừng (`pausedForOwnerDecision`) cho chính nạn nhân xử lý rồi bàn giao lại. Hết lượt đóng grant và ghi sổ chống phát lại `expiredControlGrantIds`. |
| 4 | `exp1_undead` | **Undead** | `expansion-1` | `mist-order` | **11** | `PendingResurrection`: chặn tự lật vai & miễn ép lộ diện (`eq-12` Mirror / Ernest) trước sự kiện chí tử lần đầu. Lần chí tử thứ nhất chuyển sang `DORMANT_PENDING_REVIVE` ở bước 4 (không kích hoạt death hooks, loot, hay đếm chết cho thắng phe; giữ nguyên trang bị; không thể bị nhắm mục tiêu). Đầu lượt kế tiếp của chính Undead hồi sinh tự động với **6 HP** (`woundsTaken = 5`), trạng thái `REVIVED`. Lần chí tử thứ hai chuyển sang `FINAL_ELIMINATED`. |
| 5 | `exp1_antimony` | **Antimony** | `expansion-1` | `wanderer` | **8** | `DynamicSkillCopy` + `CopiedVictoryGraph` (`COPY_GOAL`): bắt buộc sao chép kỹ năng và mục tiêu chiến thắng của người đầu tiên bị loại vĩnh viễn (lô AoE cùng lượt chọn xác định theo `turnOrder`; bỏ qua Undead ngủ đông), lộ diện và giữ nguyên `baseFaction = 'wanderer'`. Đồng thắng khi mục tiêu sao chép thỏa điều kiện. |
| 6 | `exp2_cain` | **Cain** | `expansion-2` | `wanderer` | **11** | `MultiFactionVictory`: kỹ năng kích hoạt 1 lần/trận hồi máu bằng số người chơi còn sống qua `HealPipeline` và đăng ký cờ `cainDeathVictoryModifierIds`. Khi Cain bị loại vĩnh viễn (`FINAL_ELIMINATED`), kích hoạt tức thì `winnerFaction: 'multi-faction'`, `winningFactions: ['lantern-guard', 'mist-order']`. Thắng cá nhân: 6P–8P còn sống và đã có ≥ 1 Hunter + ≥ 1 Shadow + ≥ 1 Neutral khác chết; 5P còn sống và tự tay kết liễu ≥ 1 Hunter + ≥ 1 Shadow. |
| 7 | `exp2_bonnie` | **Bonnie** | `expansion-2` | `wanderer` | **10** | `DynamicAllegiance`: khi Bonnie kết liễu nhân vật đang là Shadow (`mist-order`), bước 6a (trước kiểm tra thắng thua!) chuyển `effectiveFaction` sang `'mist-order'` (giữ nguyên `baseFaction = 'wanderer'`) và lộ diện bắt buộc. Ngăn Hunter thắng sớm nếu đó là Shadow cuối cùng; thẻ Điều tra (`inv-*`), Ernest, Bryon và bộ đếm thắng dùng `getEffectiveFaction`. |
| 8 | `exp2_nc_soldier` | **N.C. Soldier** | `expansion-2` | `wanderer` | **13** | `DynamicAllegiance` (Alliance Group): kỹ năng Chiêu Mộ thay cho đòn tấn công thường nhắm vào Neutral đã lộ diện chưa thuộc liên minh; nếu mục tiêu sống sót với `woundsTaken >= 5` → kết nạp vào liên minh độc lập và cấp bản sao kỹ năng Chiêu Mộ. Thắng liên minh tức thì khi mọi Neutral khác chia ban đầu đã được chiêu mộ VÀ thủ lĩnh nắm đủ 3 vũ khí (`ev-06`, `ev-05`, `ev-03`). Tự động loại khỏi pool chia vai 5P. |

---

## 3. Các File Chính đã Cập nhật trong Phase 7B

- **Shared Contracts & PendingChoice (31 → 34 kinds):** [`shared/contracts/boardgame.ts`](../../../shared/contracts/boardgame.ts) (`BOARD_GAME_CATALOG_VERSION = '2026.11-p7b'`, `Phase7RoleId`, `'starter-fifty-six'`, 3 PendingChoice mới: `lloyd_interrupt_attack`, `vengeful_spirit_copy_skill`, `voodoo_select_puppet`).
- **Catalog & Registry:** [`docs/boardgame-expansion/character-catalog.json`](../character-catalog.json), [`features/boardgame/domain/expansion-catalog.ts`](../../../features/boardgame/domain/expansion-catalog.ts), [`features/boardgame/domain/roles.ts`](../../../features/boardgame/domain/roles.ts), [`features/boardgame/domain/registry.ts`](../../../features/boardgame/domain/registry.ts) (`RulesetReleaseStatus`, `starter-fifty-six`, `validatePackInternally`).
- **Engine & Skill Handlers:** [`features/boardgame/domain/types.ts`](../../../features/boardgame/domain/types.ts), [`features/boardgame/domain/expansion-skills.ts`](../../../features/boardgame/domain/expansion-skills.ts) (8 skill bindings, 8 victory bindings, nâng cấp `hasEffectiveSkillUsedOnce` / `markEffectiveSkillUsedOnce` / `getEffectiveSkillRoleId` xuyên suốt các handler cho DynamicSkillCopy, 10-step elimination ordering, simultaneous AoE victim batching).
- **UI & VFX:** [`features/boardgame/ui/BoardGameArt.tsx`](../../../features/boardgame/ui/BoardGameArt.tsx), [`features/boardgame/ui/midnight-noir-tokens.ts`](../../../features/boardgame/ui/midnight-noir-tokens.ts) (`WAVE6_ROLE_IDS`; tạm giữ `MIDNIGHT_CHARACTER_ART` ở 58 WebP thật cho tới khi Phase 7C sinh xong 8 portrait AI thật), [`features/boardgame/ui/MatchResult.tsx`](../../../features/boardgame/ui/MatchResult.tsx) (`multi-faction`), [`features/boardgame/ui/vfx-queue.ts`](../../../features/boardgame/ui/vfx-queue.ts), [`features/boardgame/ui/ActionPanel.tsx`](../../../features/boardgame/ui/ActionPanel.tsx) (UI điều khiển lượt Voodoo & các huy hiệu trạng thái Tier-4).
- **Kiểm thử Hồi quy:** [`test/boardgame-phase7b.test.cjs`](../../../test/boardgame-phase7b.test.cjs) (`9/9` unit & behavioral tests cho cả 8 vai Tier-4, `starter-fifty-six`, 5P exclusion, `validatePackInternally` và khóa production).

---

## 4. Kết quả Nghiệm thu Phase 7B

- `npm run typecheck`: **PASS** (0 lỗi Frontend + Shared + Worker).
- `npm run test:boardgame`: **PASS** (`validate-character-catalog.cjs` PASS — `56/56 implemented`, `180/180` unit/DO/portrait/integration tests PASS, Classic `4,500/4,500` simulation PASS `0.00%` diff).
- `npm run test:contracts`: **PASS**.
- `npm run test:ui`: **PASS**.
- `git diff features/boardgame/domain/victory.ts`: **0 dòng thay đổi** (Classic bất biến tuyệt đối).
