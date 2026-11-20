# Bóng Đêm KTX — Phase 2A Implementation Report (First Four Playable Characters)

> **Milestone:** Phase 2A — Implement 4 tướng mở rộng đầu tiên đã có luật `verified` (`Wendigo`, `G43`, `Fiona`, `Wyvern`) trên kiến trúc server-authoritative, giữ nguyên **100% bất biến Classic** và **không mở các ruleset mở rộng lên production**.

---

## 1. Bốn Nhân vật Đã Triển khai trong Phase 2A

| ID | Tên | Gói | Phe | HP | Kỹ năng | Trigger | Victory Binding | Trạng thái |
|---|---|---|---|---:|---|---|---|---|
| `exp1_wendigo` | **Wendigo** | Exp 1 | Shadow (`mist-order`) | 14 | **Tiệc thịt** (`exp:exp1_wendigo:cannibal-feast`) | `ON_ELIMINATION` (priority 20) | `victory-engine.ts:faction#shadows` (`faction`) | `verified` / `implemented` |
| `exp2_g43` | **G43** | Exp 2 | Hunter (`lantern-guard`) | 14 | **Chế Độ Pháo Đài** (`exp:exp2_g43:fortress-mode`) | `BEFORE_DAMAGE` (priority 20) | `victory-engine.ts:faction#hunters` (`faction`) | `verified` / `implemented` |
| `exp2_fiona` | **Fiona** | Exp 2 | Hunter (`lantern-guard`) | 12 | **Đòn Đánh Giải Phẫu** (`exp:exp2_fiona:surgical-strike`) | `BEFORE_ATTACK` (priority 10) | `victory-engine.ts:faction#hunters` (`faction`) | `verified` / `implemented` |
| `exp2_wyvern` | **Wyvern** | Exp 2 | Shadow (`mist-order`) | 14 | **Hấp thụ** (`exp:exp2_wyvern:absorption`) | `ON_ELIMINATION` (priority 10) | `victory-engine.ts:faction#shadows` (`faction`) | `verified` / `implemented` |

- **52 tướng mở rộng còn lại:** Giữ nguyên `implementationStatus = "not-started"`, `availability = "coming-soon"`, `skillImpl = null`, `victoryImpl = null`.
- **Rulesets Production:** `classic` là ruleset duy nhất mở trên production (`expansion-1`, `expansion-2`, `full-expansion` tiếp tục `enabledInProduction: false` / `coming-soon`). Pool nội bộ `starter-four` (10 Classic + 4 Phase 2A) chỉ mở khi server test harness bật biến môi trường nội bộ `ALLOW_EXPERIMENTAL_RULESETS=1`.

---

## 2. Kiến trúc Thực thi & Pending Choice (Server-Authoritative)

1. **`features/boardgame/domain/expansion-skills.ts`:**
   - Đăng ký 4 executable `SkillHandlerDefinition` vào `EXPANSION_SKILL_ENGINE` (dùng `SkillEngine` với priority ordering, deterministic RNG Mulberry32, atomic rollback & recursion guard).
   - Triển khai hàng đợi bước nối tiếp thuần JSON (`PendingResolutionStep[]`) cùng `AuthoritativePendingChoice` lưu trực tiếp trong `AuthoritativeGameState` (tương thích 100% SQLite Durable Object, WebSocket Hibernation và F5 Reconnect).
   - Tách riêng `applyHpCost` khỏi `DAMAGE` pipeline, gắn `damageEventId` / `eliminationEventId` duy nhất cho mọi damage & elimination instance.
2. **Bảo mật P0 & Zero Deadlock (`projections.ts`, `worker/src/boardgame-room.ts`):**
   - `BoardGamePublicPendingChoice` che toàn bộ `ownerPlayerId` & `kind` (`null`) khi `isSecret === true` (`wendigo_reveal_heal`).
   - Khi Wendigo ẩn vai chọn `decline` hoặc hết giờ, hệ thống **không ghi bất kỳ public log nào nhắc đến Wendigo**.
   - `BoardGameRoom` lập lịch `alarm()` theo `pendingChoice.deadlineMs` ngay cả khi `turnTimeoutMs === 0`, rút ngắn hạn nếu chủ sở hữu choice rớt mạng, và gọi `applyPendingChoiceTimeout` để áp dụng fallback (`roll_0` cho Fiona, `decline` cho Wendigo) mà không phá lượt người khác.
3. **Classic Zero-Regression Isolation:**
   - Khi `rulesetId === 'classic'`, `actions.ts` và `state-machine.ts` giữ nguyên 100% đường chạy Classic gốc (`pendingChoice` và `expansionState` không được khởi tạo), bảo toàn 25/25 SHA-256 baseline RNG và 4,500-match Classic simulation.

---

## 3. Kiểm chứng Phase 2A (`test/boardgame-phase2a.test.cjs`)

- `P2A-1`: Xác minh 4/4 tướng Phase 2A đạt `isCharacterPlayable === true`, 52 tướng còn lại bị chặn, production chặn `expansion-1/2/full` và `starter-four`.
- `P2A-2a / 2b`: Wendigo ẩn vai (secret choice, zero public leak, anti-spoof, anti-replay, decline silent) & đã lật (no cooldown, max 14 HP, multi-elimination, self-death guard, kích hoạt trước victory check).
- `P2A-3`: G43 ẩn vs lật, giảm 2 ST đòn đánh (floor 0), không giảm location/card/investigation/skill, cộng dồn Holy Robe, critical, Machine Gun multi-target, phản kích Werewolf.
- `P2A-4`: Fiona 2 lần tung deterministic, Masamune 1d4 nhất quán, anti-spoof payload, không tung lần 3, timeout fallback về kết quả #1.
- `P2A-5`: Wyvern hạ Hunter/Neutral (+5 HP, trần 14), hạ Shadow (hồi đầy 14 HP), không hồi khi ẩn/không phải attack/đã chết.
- `P2A-6`: Real DO Multiplayer 4P + Spectator & 8P (`starter-four`), prod DO chặn `starter-four`, Spectator P0 privacy, DO hibernation + F5 reconnect giữa choice của Fiona, duplicate `requestId` idempotency, và timeout alarm giải phóng secret choice của Wendigo.
