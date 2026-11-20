# Bóng Đêm KTX — Phase 4B Implementation Report (`starter-twenty-six`)

> **Milestone:** Phase 4B — Triển khai Gameplay cho 10 Nhân vật Wave 3 (Tier-2) & Bộ luật Thử nghiệm `starter-twenty-six` (`36` nhân vật: `14 Hunter · 14 Shadow · 8 Neutral`).  
> **Production Status:** **Chỉ `classic` được bật trên production.** Mọi ruleset mở rộng (`starter-four`, `starter-eight`, `starter-sixteen`, `starter-twenty-six`, `expansion-1`, `expansion-2`, `full-expansion`) đều bị chặn trừ khi bật cờ thử nghiệm.

---

## 1. Danh mục 10 Nhân vật Wave 3 đã Triển khai

| # | ID | Tên nguồn | Phe | HP | Rules Status | Skill Binding | Victory Binding | Pending Choice |
|---|---|---|---|---:|---|---|---|---|
| 1 | `exp1_fallen` | Fallen | Hunter (`lantern-guard`) | 12 | `house-rule-approved` | `exp:exp1_fallen:resistance` (`BEFORE_DAMAGE` + `REVEAL_ROLE` guard) | `victory-engine.ts:faction#hunters` | — |
| 2 | `exp1_fea` | Fea | Hunter (`lantern-guard`) | 12 | `house-rule-approved` | `exp:exp1_fea:dice-adjust` (`ON_MOVE`) | `victory-engine.ts:faction#hunters` | `fea_move_adjust` |
| 3 | `exp2_eleanor` | Eleanor | Hunter (`lantern-guard`) | 10 | `house-rule-approved` | `exp:exp2_eleanor:interrogator` (`ACTIVE_SKILL`) | `victory-engine.ts:faction#hunters` | — |
| 4 | `exp2_fujiko` | Fujiko | Hunter (`lantern-guard`) | 12 | `house-rule-approved` | `exp:exp2_fujiko:its-over` (`AFTER_ATTACK`) | `victory-engine.ts:faction#hunters` | — |
| 5 | `exp1_udi` | Udi | Shadow (`mist-order`) | 11 | `house-rule-approved` | `exp:exp1_udi:hiding` (`BEFORE_ATTACK` + target legality) | `victory-engine.ts:faction#shadows` | — |
| 6 | `exp1_wrath` | Wrath | Shadow (`mist-order`) | 14 | `house-rule-approved` | `exp:exp1_wrath:cluster-aoe` (`ON_TURN_START`) | `victory-engine.ts:faction#shadows` | `wrath_turn_start_aoe` |
| 7 | `exp1_vengeance` | Vengeance | Shadow (`mist-order`) | 13 | `house-rule-approved` | `exp:exp1_vengeance:chain-strike` (`ON_ELIMINATION`) | `victory-engine.ts:faction#shadows` | `vengeance_chain_strike` |
| 8 | `exp2_visions` | Visions | Shadow (`mist-order`) | 13 | `house-rule-approved` | `exp:exp2_visions:curse-mark` (`ON_TURN_START` + target legality) | `victory-engine.ts:faction#shadows` | `visions_mark_target` |
| 9 | `exp2_cruz` | Cruz | Neutral (`wanderer`) | 11 | `house-rule-approved` | `exp:exp2_cruz:black-redraw` (`ON_DRAW_CARD`) | `victory-engine.ts:neutral#cruz` | `cruz_black_redraw` |
| 10 | `exp2_bryon` | Bryon | Neutral (`wanderer`) | 10 | `house-rule-approved` | `exp:exp2_bryon:generous-service` (`BEFORE_ATTACK`) | `victory-engine.ts:shared#bryon` | `bryon_gift_equipment` |

---

## 2. Tóm tắt Thay đổi Kỹ thuật Chính

1. **Hợp đồng & Catalog (`shared/contracts/boardgame.ts`, `character-catalog.json`, `expansion-catalog.ts`):**
   - Nâng `BOARD_GAME_CATALOG_VERSION = '2026.11-p4b'`, thêm `Phase4RoleId` vào `BoardGameRoleId`, thêm `'starter-twenty-six'` vào `BoardGameExperimentalRulesetId`, thêm 6 `BoardGamePendingChoiceKind` mới và `visionsMarkedTargetByPlayer` (chỉ lộ khi Visions đã lật vai — zero hidden-role leak).
   - Đồng bộ đúng 10 nhân vật Wave 3 sang `rulesStatus: "house-rule-approved"`, `implementationStatus: "implemented"`; giữ nguyên 30 nhân vật còn lại (`6H / 7S / 17N`) ở `needs-clarification` / `not-started`.
2. **Engine Thực thi Server-Authoritative (`expansion-skills.ts`, `actions.ts`, `victory-engine.ts`, `registry.ts`, `projections.ts`):**
   - Toàn bộ 6 `PendingChoice` mới dùng mã `optionId` ngắn gọn khớp chặt `STRICT_OPTION_ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/` với bảng ánh xạ authoritative thuần JSON trong `PendingChoiceContextData`, tương thích 100% SQLite DO Hibernation.
   - Hợp nhất bộ lọc mục tiêu tấn công mở rộng (`canExpandedPlayerAttackTarget` / `listExpandedReachableAttackTargets`) cho `ATTACK`, `Machine Gun`, `Werewolf` phản kích, `Charles` chém bồi và kiểm tra bắt buộc đánh của `Masamune` (`ev-01`) để đảm bảo Udi và Visions không bao giờ gây deadlock lượt.
   - `Fujiko` kết liễu hoàn toàn đi qua nhánh loại người chơi thống nhất (`alive = false`, `Silver Rosary`/loot, `ELIMINATION_TRIGGERS`, rồi mới kiểm tra chiến thắng).
   - `Vengeance` khóa `skillUsedOnce = true` trước khi tung `1d4` dùng chung cho 2 mục tiêu, chạy ở priority 15 (sau `Wyvern`, trước `Wendigo`) và chống đệ quy tuyệt đối.
   - `Cruz` ghi nhận lượt chơi 4 lá bài Đen chuẩn (`ev-07..ev-10`) và chỉ tính khi `killerPlayerId === cruzId` trong cùng `turnNumber`; đổi bài Đen đặt chính xác xuống đáy `decks.event` không đệ quy.
   - `Bryon` chuyển trang bị nguyên tử (loại trừ `ev-01` Masamune), bảo toàn quyền tấn công, kích hoạt kiểm tra thắng tức thì nếu tặng Bob lên 5 trang bị, và đánh giá thắng "không Neutral nào chết" chỉ tại thời điểm kết thúc trận hợp lệ.
3. **Giao diện & VFX (`BoardGameArt.tsx`, `ActionPanel.tsx`, `RoleCard.tsx`, `vfx-queue.ts`, `midnight-noir-tokens.ts`):**
   - Bổ sung đầy đủ metadata, trạng thái khóa/mở kỹ năng, nhãn chiến thuật `Ẩn thân` / `Dấu ấn Visions`, bảo vệ tự lật vai của `Fallen` (`< 8 HP`) và hiệu ứng VFX tương ứng.
   - Tạm dùng fallback Noir Monogram trên `MIDNIGHT_CHARACTER_ART` cho 10 nhân vật Wave 3 trước khi Phase 4C bổ sung chân dung WebP `1024×1536`.

---

## 3. Kiểm chứng Milestone 4B

- Bộ unit & interaction test riêng: [`test/boardgame-phase4b.test.cjs`](../../../test/boardgame-phase4b.test.cjs) (11 nhóm kịch bản bao phủ toàn bộ 10 tướng và ma trận tương tác bắt buộc).
- Đã tích hợp vào lệnh chuẩn `npm run test:boardgame` và vượt qua toàn bộ kiểm tra kiểu (`npm run typecheck`), catalog validator, UI/VFX và Classic 4,500-match zero-regression.
