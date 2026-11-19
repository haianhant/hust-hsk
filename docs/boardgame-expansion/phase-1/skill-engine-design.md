# Bóng Đêm KTX — Phase 1 Skill & Victory Engine Design

> Đặc tả kỹ thuật cho hai nền tảng thực thi mới tại [`features/boardgame/domain/skill-engine.ts`](../../../features/boardgame/domain/skill-engine.ts) và [`features/boardgame/domain/victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts).

---

## 1. Hệ thống Event / Trigger (`SkillEngine`)

### 1.1. Danh mục Trigger chuẩn (`SKILL_TRIGGERS`)

| Trigger | Thời điểm phát sinh | Tướng tiêu biểu (Phase 2+) |
|---|---|---|
| `ON_TURN_START` | Đầu lượt người chơi | `Wrath`, `Voodoo`, `Bipolar`, `Anathema`, `Bethany`, `Cassie`, `Clairvoyant`, `Visions` |
| `ON_MOVE` | Gieo xúc xắc / di chuyển địa điểm | `Lan (Emi)`, `Fea`, `Father Harrison`, `Warlord` |
| `ON_DRAW_CARD` | Rút lá từ chồng bài Xanh/Trắng/Đen | `Felicia`, `Gloria`, `Cruz` |
| `BEFORE_ATTACK` | Trước khi đổ xúc xắc tấn công / chọn mục tiêu | `Gayle`, `Fiona`, `Udi`, `Bryon` |
| `AFTER_ATTACK` | Sau khi hoàn tất đòn đánh thường | `Tú (Vampire)`, `Dũng (Werewolf)`, `Bách (Charles)`, `Gwendolen`, `Fujiko`, `Freyja` |
| `BEFORE_DAMAGE` | Trước khi trừ HP / tăng vết thương | `Hải (Bob)`, `G43`, `Elysia`, `Fallen`, `Undying`, `Victor`, `Arnold`, `Warlock`, `Witch`, `Urban Legend`, `Unchained` |
| `AFTER_DAMAGE` | Ngay sau khi sát thương đã áp dụng | `Cindy`, `Dalton`, `April & Skipps` |
| `ON_HEAL` | Khi có nguồn hồi máu (kỹ năng / thẻ Trắng / ô 9) | `Usurper`, `Dalton` |
| `ON_ROLE_REVEAL` | Khi một nhân vật lộ diện (tự nguyện hoặc bị ép) | `Umibozu`, `Diana`, `Aaron` |
| `ON_ELIMINATION` | Khi một nhân vật bị hạ gục | `Đạt (Daniel)`, `Wendigo`, `Wyvern`, `Vengeance`, `Vengeful Spirit`, `Antimony`, `Undead`, `Gideon`, `Bonnie` |
| `ON_EQUIPMENT_CHANGE` | Khi trang bị bị cướp / trao / hủy | `Colt` |
| `ON_INVESTIGATE` | Khi nhận thẻ Điều tra Xanh lá | `Khánh (Unknown)`, `Arlene` |
| `ON_VICTORY_CHECK` | Khi hệ thống đánh giá thắng thua | Điều kiện thắng động |
| `ACTIVE_SKILL` | Kỹ năng chủ động kích hoạt trong lượt | `Minh (George)`, `Vy (Franklin)`, `Trang (Allie)`, `Ernest`, `Angel`, `Eleanor`, `Elise`, `Cain`, `N.C. Soldier` |
| `REACTION_INTERRUPT` | Ngắt hành động ngoài lượt (Phase 3) | `Lloyd`, `Bianca`, `Usurper` |

---

### 1.2. Các Bất biến Kỹ thuật bắt buộc của `SkillEngine`

1. **Event Ordering & Trigger Priority (Xác định tuyệt đối):**
   - Với mỗi sự kiện, mọi handler thỏa mãn điều kiện (`owner.roleId === handler.roleId`, `requiresAlive`, `requiresRevealed`, `oncePerMatch`, `cooldownRounds`) được sắp xếp theo khóa 3 bậc:
     1. `handler.priority` tăng dần (số nhỏ chạy trước).
     2. `computeSeatDistanceFromActive(state, owner.playerId)` tăng dần (theo chiều vòng lượt tính từ `state.activePlayerId`).
     3. `handler.id.localeCompare(...)` tăng dần (phá vỡ mọi hòa).
   - Sự kiện con phát sinh qua `ctx.emit(child)` được chèn vào đầu hàng đợi theo thứ tự phát sinh (depth-first deterministic).
2. **Deterministic RNG:**
   - `ctx.rng.nextInt(min, max)` và `ctx.rng.nextFloat()` dùng trực tiếp `nextDeterministicRandom(state.rngState)` (Mulberry32), **tuyệt đối không gọi `Math.random()`**.
3. **Once-Per-Match & Cooldown:**
   - Được kiểm tra trước khi gọi `canTrigger` và tự động tiêu hao (`owner.skillUsedOnce = true`, `owner.skillCooldown = handler.cooldownRounds`) chỉ khi `outcome.applied === true`.
4. **Recursion Depth & Infinite-Loop Protection:**
   - Giới hạn độ sâu đệ quy (`maxDepth`, mặc định `8`) -> dừng an toàn với `abortedReason: 'MAX_RECURSION_DEPTH'`.
   - Giới hạn tổng số lần kích hoạt trong 1 gốc sự kiện (`maxDispatches`, mặc định `32`) -> dừng an toàn với `abortedReason: 'MAX_DISPATCHES'`.
   - Bộ phát hiện chu trình theo chữ ký `(trigger | handlerId | ownerId | actorId | targetId)` -> khi gặp lại ở `depth > 0`, lập tức dừng an toàn với `abortedReason: 'LOOP_DETECTED'`.
5. **Server-Authoritative Atomic Transitions:**
   - Chạy duy nhất trong Durable Object server (`BoardGameRoom`); mặc định `atomic: true` chụp snapshot trước khi dispatch và **rollback nguyên vẹn `state`** (`rolledBack: true`) nếu bất kỳ handler nào ném ngoại lệ giữa chừng.
6. **Idempotency (Chống áp dụng trùng khi retry/reconnect):**
   - Mỗi sự kiện gắn `eventKey` (ví dụ `${matchId}:${revision}:${requestId}:${trigger}`). Nếu `eventKey` đã hoàn tất trong bộ đệm giới hạn (`MAX_IDEMPOTENCY_KEYS = 256`), `dispatch()` lập tức trả `{ ok: true, skippedIdempotent: true, trace: [] }` mà không chạy lại handler hay tiêu hao RNG.
7. **Classic Adapter Safety:**
   - `CLASSIC_SKILL_ADAPTER_BINDINGS` ánh xạ 10 tướng Classic tới các hàm gốc trong `effects.ts` phục vụ xác thực Registry. Trong Phase 1, đường chạy Classic trong `effects.ts` được **giữ nguyên 100%** (zero behavior/order/RNG change).

---

## 2. Kiến trúc Điều kiện Thắng (`VictoryEngine`)

`features/boardgame/domain/victory-engine.ts` hỗ trợ đầy đủ **7 nhóm điều kiện thắng (`VICTORY_ARCHETYPES`)**:

1. **`faction`:** Thắng theo phe (Hunter tiêu diệt hết Shadow; Shadow tiêu diệt hết Hunter hoặc >= 3 Neutral).
2. **`individual`:** Thắng độc lập cá nhân (`Bob`, `Charles`, `Daniel` chết đầu, `Dalton`, `Bianca`, `Colt`, `Cruz`, `Cindy`, `Arnold`, `April & Skipps`, `Angel`).
3. **`shared`:** Đồng thắng cùng phe/người khác (`Allie`, `Bethany`, `Aaron`, liên minh `N.C. Soldier`).
4. **`conditional`:** Điều kiện thắng có nhánh rẽ / fallback (`Daniel` sống cùng Hunter, `Bipolar`, `Diana` đầy máu, `Aaron` tự chết).
5. **`dynamic-allegiance`:** Hỗ trợ `ctx.getEffectiveFaction(player)` tách biệt phe runtime với phe gốc (`Bonnie`, `N.C. Soldier`).
6. **`copied-victory`:** Hỗ trợ `ctx.resolveLinkedWinner(sourceId, targetId, predicate, visited)` với **phát hiện chu trình đồ thị (`cycleDetected: true`)** ngăn vòng lặp vô hạn (`Bethany <-> Diana <-> Cassie <-> Clairvoyant`).
7. **`simultaneous-victory`:** Gộp đồng thắng từ tất cả ứng viên đạt điều kiện kết thúc trận và co-win (đòn quyết tử đồng quy Classic & `Cain` thêm điều kiện thắng cho cả 2 phe).

**Đảm bảo Classic Equivalence:**
- Khi `rulesetId === 'classic'` và không có custom evaluator mở rộng, `evaluateVictoryWithEngine(state)` gọi trực tiếp `evaluateVictory(state)` trong `victory.ts`, bảo đảm tương đương 100% (đã kiểm chứng bằng test `B4`).
