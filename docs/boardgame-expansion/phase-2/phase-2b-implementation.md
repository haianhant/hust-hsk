# Phase 2B Implementation Report — Complete Starter Eight (`Gayle`, `Felicia`, `Victor`, `Undying`)

> **Trạng thái:** ✅ Hoàn tất Milestone Phase 2B (4 nhân vật thử nghiệm house-rule hoạt động qua `SkillEngine` & `VictoryEngine`, mở rộng pool nội bộ `starter-eight` = 18 tướng, tất cả test & build gates PASS).
> **An toàn Production:** `starter-four`, `starter-eight`, `expansion-1`, `expansion-2`, `full-expansion` đều **TẮT trên production** (`enabledInProduction: false`); `classic` giữ nguyên 100% RNG, luật & hiệu năng.

---

## 1. Bốn Nhân vật Phase 2B Đã Triển khai (`rulesStatus: "house-rule-approved"`)

| ID | Nhân vật | Phe | HP | Trigger & Priority | Handler (`EXPANSION_SKILL_ENGINE`) | Pending Choice | Phân loại luật |
|---|---|---|---:|---|---|---|---|
| `exp1_gayle` | **Gayle** | Hunter | 14 | `BEFORE_ATTACK` (p15) | `exp:exp1_gayle:trainee-fighter` | `gayle_attack_reroll` (`isSecret: false`) | `HOUSE_RULE_APPROVED_EXPERIMENTAL` |
| `exp1_felicia` | **Felicia** | Hunter | 12 | `ON_DRAW_CARD` (p10) | `exp:exp1_felicia:resourceful` | `felicia_draw_choice` (`isSecret: false`, bài ẩn tuyệt đối trong `privateView`) | `HOUSE_RULE_APPROVED_EXPERIMENTAL` |
| `exp1_victor` | **Victor** | Shadow | 13 | `BEFORE_DAMAGE` (p5) | `exp:exp1_victor:mad-scientist` | `victor_blood_boost` (`isSecret: false`) | `HOUSE_RULE_APPROVED_EXPERIMENTAL` |
| `exp1_undying` | **Undying** | Shadow | 11 | `BEFORE_DAMAGE` (p30) | `exp:exp1_undying:iron-plating` | `undying_reveal_reduce` (`isSecret: true`, zero leak) | `HOUSE_RULE_APPROVED_EXPERIMENTAL` |

---

## 2. Chi tiết Kiến trúc & Cơ chế Đã Bổ sung

1. **Contract & Catalog (`shared/contracts/boardgame.ts`, `character-catalog.json`, `expansion-catalog.ts`):**
   - Bổ sung `Phase2BRoleId` vào `BoardGameRoleId`, mở rộng `BoardGameExperimentalRulesetId` thêm `'starter-eight'`, nâng `BOARD_GAME_CATALOG_VERSION = '2026.11-p2b'`.
   - Đánh dấu duy nhất 4 nhân vật Phase 2B thành `rulesStatus: "house-rule-approved"` + `implementationStatus: "implemented"`, giữ nguyên văn mô tả nguồn; 48 nhân vật còn lại giữ nguyên `needs-clarification` / `not-started`.
2. **Engine Execution (`features/boardgame/domain/expansion-skills.ts`, `actions.ts`, `registry.ts`, `effects.ts`):**
   - **Gayle:** Chỉ kích hoạt cho `ATTACK` khi đã lật vai (không chạy ở `ROLL_MOVE`); giữ hoặc đổ lại 1 lần duy nhất theo đúng quy tắc xúc xắc vũ khí (`Masamune 1d4` / thường `|1d6-1d4|`); bắt buộc áp dụng lần 2 kể cả khi xấu hơn; không xếp chồng.
   - **Felicia:** Hook `applyExpandedDrawLocationCard` tại `DRAW_CARD` cho chế độ mở rộng; chỉ kích hoạt cho White (`equipment`) & Black (`event`), bỏ qua Green (`investigation`) và chặn đệ quy (`isLocationDraw && !isRecursiveDraw`); xử lý đủ 3 nhánh 0 lá / 1 lá / 2 lá + xáo lại chồng bỏ; 2 lá rút chỉ tồn tại trong `privateView.pendingChoice`, lá bỏ đi vào `discards[deckId]`.
   - **Victor:** Chỉ kích hoạt khi đã lật vai, `baseDmg > 0` và `hp >= 2`; trừ 1 HP qua `applyHpCost` (không thể giảm bởi giáp/khiên/Undying); cộng `+2` cho duy nhất 1 mục tiêu đã chọn kể cả khi cầm `Machine Gun`.
   - **Undying:** Kiểm tra ngưỡng `>= 2 ST` **sau** `Guardian Angel`, `Talisman`, `Holy Robe (-1)` và `G43`, **trước** khi trừ HP; áp dụng cho `attack | skill | event | investigation` (loại trừ `hp-cost`, `unpreventable`, `location`); khi chưa lộ vai mở Secret Pending Choice (tuyệt đối không tự lật, không rò rỉ log/DTO khi từ chối/timeout); khi đã lộ vai tự động giảm 1 ST tối đa 1 lần mỗi `damageEventId`.
   - **Tương tác `eq_chocolate`:** Giữ nguyên Classic; trong chế độ mở rộng, `Undying` (chữ cái đầu `U`) được nhận diện hợp lệ theo luật A/E/U.
   - **Pool `starter-eight`:** 18 tướng (7 Hunter · 7 Shadow · 4 Neutral), bật `allowExperimentalHouseRules: true`, khóa cứng trên production (`enabledInProduction: false`).
3. **Midnight Noir UI, VFX & Sound (`BoardGameArt.tsx`, `ActionPanel.tsx`, `RoleCard.tsx`, `vfx-queue.ts`, `sound.ts`):**
   - Thêm metadata & huy hiệu trạng thái kỹ năng cho 4 tướng Phase 2B (phân biệt rõ *Sẵn sàng lật phản ứng*, *Cần ≥ 2 HP*, *Sẵn sàng khi rút Trắng/Đen*, *Nội tại đang kích hoạt*).
   - Nâng cấp `bg-pending-choice-panel` hiển thị ảnh thẻ bài + bộ bài cho Felicia, chip xúc xắc cho Fiona/Gayle, chi phí HP + mục tiêu cho Victor, và khung phản ứng bí mật cho Wendigo/Undying.
   - Bổ sung VFX (`HEAL_AURA`, `SHIELD_GUARD` + `-2 ST`/`-1 ST`, `MASAMUNE_SLASH`) và âm thanh đặc trưng tôn trọng `reducedMotion` và P0 privacy (chỉ chạy khi vai đã lộ diện công khai).

---

## 3. Kiểm thử Bổ sung (`test/boardgame-phase2b.test.cjs`)

- `P2B-1`: Playability gate (8 implemented = 4 verified + 4 house-rule-approved; 48 not-started; `starter-eight` bị chặn trên production, hợp lệ khi `allowExperimental: true`; `starter-four` vẫn chỉ chứa 14 tướng).
- `P2B-2`: Gayle — không kích hoạt khi úp vai hoặc di chuyển; giữ #1 vs đổ lại bắt buộc lấy #2 kể cả khi xấu hơn; Masamune nhất quán cả 2 lần; không xếp chồng reroll; timeout fallback `keep`.
- `P2B-3`: Felicia — White & Black rút 2 chọn 1 hủy 1; Green Investigation bỏ qua; ẩn danh tính 2 lá khỏi publicGame/publicLog/Spectator; deck 0 lá, 1 lá, reshuffle từ discard; không đệ quy; timeout fallback `pick_0`.
- `P2B-4`: Victor — yêu cầu lật vai, `baseDmg > 0` (chặn khi hụt), `hp >= 2` (chặn tự sát ở 1 HP); 1 HP cost không bị giảm bởi Holy Robe/khiên; Machine Gun chỉ +2 cho ĐÚNG 1 mục tiêu chọn; không kích hoạt từ thẻ/kỹ năng.
- `P2B-5`: Undying — Holy Robe `2 -> 1` không kích hoạt vs `3 -> 2 -> 1` kích hoạt; Guardian Shield / Talisman miễn thương không hỏi; critical, Machine Gun AoE, Flare, Dynamite, Investigation 2 ST, skill 1d4/1d6; HP cost & Corridor location bị loại trừ; secret reveal choice (cứu sống ở 2 HP khi nhận 2 ST) vs decline im lặng; đã lật vai tự áp dụng trên các đòn liên tiếp không lặp/không hồi máu; `eq_chocolate` nhận diện `U` trong chế độ mở rộng.
- `P2B-6`: Real DO Multiplayer trên `starter-eight` (4P + Spectator & 8P): chặn trên prod DO; Felicia private 2-card draw zero-leak với Spectator + F5 reconnect + hibernation; hidden Undying secret reaction zero-leak + alarm timeout fallback không treo trận.
