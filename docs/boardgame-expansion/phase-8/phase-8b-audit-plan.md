# Bóng Đêm KTX — Phase 8B Deep Gameplay Logic Audit Plan

> **Baseline Commit:** `72595c5d4730451d5e1d878874ded825d17aeb80`  
> **Phạm vi kiểm toán:** Toàn bộ engine trạng thái (`features/boardgame/domain/*`), tầng đồng bộ & phòng chơi Durable Object (`worker/src/boardgame-room.ts`, `boardgame-router.ts`), hợp đồng chia sẻ (`shared/contracts/boardgame.ts`), 66 nhân vật (`classic`, `expansion-1`, `expansion-2`, `full-expansion`), và hạ tầng kiểm thử hiện có.  
> **Nguyên tắc trung thực:** Mọi phát hiện phải phân biệt tường minh giữa *Confirmed Bug*, *Potential Risk*, *Intended House-Rule Behavior*, *Test Coverage Gap*, *Balance Concern*, và *Unverified Hypothesis*. Tuyệt đối không bịa lỗi và không tự ý thay đổi thông số cân bằng (HP / điều kiện thắng).

---

## 1. Baseline Kiểm thử Hiện hữu (Pre-8B)

- **6 cổng bắt buộc (`GEMINI.md`):**
  1. `npm run typecheck` — Frontend + Shared + Worker TypeScript (`0` lỗi).
  2. `npm run test:learn` — `45/45` unit tests học HSK/SRS.
  3. `npm run test:contracts` — `5/5` shared contracts & DO hibernation.
  4. `npm run test:nav` — `4/4` mô phỏng dẫn đường & va chạm sân trường.
  5. `npm run test:mp` — `33/33` kịch bản WebSocket Multiplayer shim.
  6. `npm run build` — Xuất bản tĩnh Next.js (`out/`).
- **Cổng Board Game (`npm run test:boardgame`):**
  - 28 bộ test từ Lounge/Lobby/Engine/DO → Phase 2–7 → Phase 8A Production Beta (`test/boardgame-phase8a-beta-release.test.cjs`), kèm mô phỏng hồi quy 4.500 trận Classic (`test/boardgame-sim.cjs`, `0.00%` sai lệch) và 25/25 Classic RNG fingerprints.
  - Mô phỏng 30.000 trận Full Catalog (`scripts/sim-starter-fifty-six.cjs`): `0` stall, `0` privacy leak, `0` equipment violation (trên policy bot chuẩn hóa).
  - 5 shard Playwright E2E (`bg1-smoke`, `e2e-01-04`, `e2e-02`, `e2e-03`, `e2e-05-06`).

---

## 2. Phạm vi Kiểm toán 16 Bước Chuyển Trạng thái Vòng Lượt

| # | Giai đoạn / Chuyển trạng thái | Tệp nguồn trọng tâm | Nhóm bất biến & lỗi cần soi |
|---:|---|---|---|
| 1 | Khởi tạo ván (`createInitialGameState`) | `state-machine.ts`, `registry.ts` | Chia 48 lá bài (16/16/16), 3 Cụm 6 ô, loại `exp2_nc_soldier` bàn 5P, tách PRNG Classic |
| 2 | Chia vai (`Role dealing`) | `state-machine.ts`, `roles.ts` | Đúng tỷ lệ H/S/N theo 4P–8P, không trùng `roleId`, ghi `originallyDealtNeutralIds` |
| 3 | Bắt đầu lượt (`advanceTurn`, `triggerExpandedTurnStart`) | `actions.ts`, `expansion-skills.ts`, `pending-resurrection.ts` | Hồi sinh Undead 6 HP, kích hoạt Voodoo grant, hợp đồng Diana, hào quang Angel, tick Visions, prompt đầu lượt |
| 4 | Di chuyển (`ROLL_DICE`, `CHOOSE_DEST`, Fea, Compass, Father Harrison) | `effects.ts`, `expansion-skills.ts` | Không đứng yên ô cũ, đếm `consecutiveSameZoneRolls`, Fea +/-1 biên `[2..10]`, không tiêu hao RNG kép |
| 5 | Hành động khu vực (`DRAW_CARD`, `USE_LOC_POWER`, `SKIP_LOC`) | `effects.ts`, `expansion-skills.ts` | Đúng chồng bài theo ô, quyền năng Ô 9 / Ô 10, giao dịch cướp đồ Colt |
| 6 | Rút & giải quyết bài (`EQUIP_CARD`, `USE_CARD`, `INVESTIGATE_CARD`) | `effects.ts`, `expansion-skills.ts`, `turn-ownership.ts` | Bảo toàn 48 thẻ bài, Gloria queue, Felicia/Cruz redraw, quyền Voodoo với lá tự lộ (`Advent`/`Chocolate`/`Diabolic Ritual`) |
| 7 | Kỹ năng đặc biệt (`USE_SKILL`, `TRANSFER_TO_BETHANY`, `REVEAL_ROLE`) | `expansion-skills.ts`, `dynamic-skill-copy.ts` | Thực thi nhất quán qua `getEffectiveSkillRoleId`, giới hạn once-per-match độc lập, chặn lộ Undead trước lần chết đầu |
| 8 | Tuyên bố tấn công (`startExpandedAttack`, `GlobalAttackInterrupt`) | `expansion-skills.ts`, `global-attack-interrupt.ts` | Kiểm tra Udi/Visions/Aaron/Dormant, chụp Machine Gun làm 1 đòn, Lloyd hủy trước RNG |
| 9 | Phản ứng phòng thủ & bí mật (`BEFORE_DAMAGE`, `AFTER_DAMAGE`, `SET_REACTION_PREF`) | `expansion-skills.ts`, `damage-redirection.ts`, `heal-pipeline.ts` | Thứ tự Anathema → Urban Legend → Angel/Shield/Witch/Armor/G43 → Undying → Bianca → Arnold → HP; ẩn `choice-secret-*` |
| 10 | Giải quyết sát thương & hồi máu | `damage-redirection.ts`, `heal-pipeline.ts`, `expansion-skills.ts` | HP luôn thuộc `[0, maxHp]`, `woundsTaken === maxHp - hp`, giới hạn độ sâu chuyển hướng, chặn Usurper/Dalton |
| 11 | Loại khỏi trận & Hồi sinh (`10-step Elimination Transaction`) | `pending-resurrection.ts`, `expansion-skills.ts` | Undead ngủ đông không kích hoạt loot/death-triggers/thắng Hunter sớm; chết lần 2 loại vĩnh viễn; gom nhóm AoE |
| 12 | Chuyển nhượng & cướp trang bị | `equipment-transactions.ts`, `effects.ts` | Bảo toàn tổng thẻ (không nhân bản/mất tích), cấm tặng Masamune, thu hồi nguyên tử của Colt |
| 13 | Đánh giá chiến thắng (`evaluateExpandedVictoryWithDiagnostics`) | `victory-engine.ts`, `copied-victory-graph.ts`, `dynamic-allegiance.ts` | `effectiveFaction` Bonnie, `MultiFactionVictory` Cain, `COPY_GOAL` (Cassie/Clairvoyant/Antimony), cycle guard fail-closed |
| 14 | Kết thúc lượt (`END_TURN`, `applyExpandedTurnEndHooks`) | `actions.ts`, `expansion-skills.ts` | Bắt buộc đánh khi cầm Masamune, trừ 1 HP cuối lượt Anathema, đếm ngược April & Skipps, hết hạn Voodoo grant |
| 15 | Khép ván & ghi bảng xếp hạng/telemetry | `actions.ts`, `boardgame-room.ts` | Không kết thúc ván 2 lần, idempotent leaderboard & telemetry, giữ nguyên dữ liệu lịch sử |
| 16 | Mất kết nối, lưu trữ SQLite, Reconnect & Alarm Timeout | `boardgame-room.ts`, `actions.ts` | Fencing `4001`, giữ nguyên deadline `pendingChoice` khi reconnect, khôi phục deadline sau choice, chống bỏ qua lượt người kế khi timeout |

---

## 3. Phân loại Sơ bộ Từ Đọc Mã nguồn Trực tiếp (Trước Khi Chạy Stateful Fuzzer)

### A. Confirmed Bugs (Sẽ xác minh bằng failing test tái lập tối thiểu trước khi vá)
1. **BUG-8B-01 (P0 — Privacy / Authorization Oracle · Voodoo):** Trong `applyExpandedUseCard`, khi `controllerPlayerId` (Voodoo) sử dụng thẻ tùy chọn tự lật vai (`eq-13` Advent, `eq-14` Chocolate, `ev-13` Diabolic Ritual) với `skipEffect: false` trên nạn nhân **chưa lộ diện**, máy chủ trực tiếp kiểm tra phe/vai ẩn của nạn nhân và lật công khai vai của nạn nhân — vi phạm bất biến P0 `RC-01` (Voodoo không được ép lộ vai hay dò phe ẩn của nạn nhân).
2. **BUG-8B-02 (P0 — Deadlock / Alarm Loss · Reconnect trên `pendingChoice`):** Trong `worker/src/boardgame-room.ts` (`handleJoin`), khi `turn_timeout_ms <= 0` (chính là **mặc định production** `BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS = 0`) và người sở hữu `pendingChoice` reconnect (F5), `getEffectiveTurnControllerId(engineState) === existing.player_id` kích hoạt `UPDATE matches SET turn_deadline_ms = NULL`, xóa sạch alarm timeout của `pendingChoice` → nếu người chơi AFK sau khi F5, bàn bị treo vĩnh viễn!
3. **BUG-8B-03 (P1 — Stale Choice Deadline Causes Premature Turn Timeout):** Trong `worker/src/boardgame-room.ts` (`handleGameAction`), khi `turn_timeout_ms > 0` và một `pendingChoice` vừa kết thúc trong cùng lượt (`turnChanged === false`), `nextDeadline` giữ lại `match.turn_deadline_ms` cũ (vốn là deadline ngắn của `pendingChoice`, có thể chỉ còn vài trăm ms nếu chủ choice vừa rớt mạng) thay vì tính lại deadline cho lượt đang tiếp diễn → có thể gây `TURN_TIMEOUT` oan cho chủ lượt.
4. **BUG-8B-04 (P1 — Double Turn Advance on `applyTimeoutAutoTurn`):** Trong `features/boardgame/domain/actions.ts` (`applyTimeoutAutoTurn`), khi gọi `clearPendingChoiceOnForcedAutoTurn`, việc giải quyết choice hết hạn (ví dụ `lloyd_interrupt_attack`, `fiona_attack_roll`, `undying_reveal_reduce`, `wendigo_reveal_heal`) có thể tự hoàn tất hành động và gọi `advanceTurn` sang người chơi kế tiếp — nhưng `applyTimeoutAutoTurn` không kiểm tra `state.turnNumber !== startTurnNumber` mà tiếp tục chạy, auto-skip luôn toàn bộ lượt mới của người chơi kế tiếp!
5. **BUG-8B-05 (P1 — Undead Pre-Lethal Reveal Bypass via `ev-13` Diabolic Ritual):** `applyExpandedUseCard` cho `ev_diabolic_ritual` không kiểm tra `isUndeadPreLethalRevealRestricted(state, actor)`, cho phép Undead đang ẩn lật vai trước sự kiện chí tử lần đầu (vi phạm `RC-02`).
6. **BUG-8B-06 (P1 — DynamicAllegiance Inconsistency sau chuyển phe Bonnie):**
   - `applyExpandedUseCard` (`ev_diabolic_ritual`) kiểm tra `actor.faction === 'mist-order'` thay vì `getEffectiveFaction(state, actor)` → Bonnie sau khi chuyển thành Shadow không dùng được `ev-13`.
   - `reveal-events.ts` (`recordAuthoritativeRevealEvent`) ghi `factionAtReveal: player.faction` thay vì `getEffectiveFaction(state, player)`; `executeRoleRevealedTriggersStep` (Cassie) và `dianaForHireHandler` (Diana) kiểm tra `revealedPlayer.faction === 'wanderer'` → khi Bonnie chưa lộ giết Shadow, chuyển sang Shadow rồi lộ diện ở Bước 6a, Cassie và Diana vẫn gắn nhầm Bonnie đã thành Shadow làm Neutral!
   - `projections.ts` (`angelProtectedPlayerIds`) kiểm tra `p.faction === 'wanderer'` thay vì `isEffectiveNeutral(state, p)` → hiển thị sai huy hiệu hào quang Angel bảo hộ lên Bonnie đã thành Shadow dù engine không bảo hộ!
7. **BUG-8B-07 (P1 — Systemic `DynamicSkillCopy` Bypass across 13 Runtime Hooks):** Nhiều nhánh thực thi kiểm tra cứng `player.roleId === ...` / `player.skillUsedOnce` thay vì `getEffectiveSkillRoleId(state, player)` / `hasEffectiveSkillUsedOnce(state, player)`, làm gãy kỹ năng đã sao chép bởi `Vengeful Spirit` / `Antimony` đối với: `Anathema` (redirect + 1 HP end-turn cost), `Arnold` (lethal reflection), `Usurper` (heal block + public aura), `Angel` (armed→active→expired transition + death expiry), `Visions` (turn-start mark tick), `Urban Legend`, `Witch`, `Bianca`, `Dalton` (threshold activation), `Fujiko`, `Werewolf` (`suong-gac-cong`), `Freyja`, `Colt`, `Bob` (`lang-anh-san` robbery & 7P+ loot), `Charles` (`canTriggerCharlesBloodyFeast`), và `predictExpectedAttackDealt` (`Witch`/`G43`/`Undying`).
8. **BUG-8B-08 (P1 — Copied Victory Goal (`COPY_GOAL`) Missing Event-Flag Tracking & Dormant Guard):**
   - `evaluateDirectRoleGoalForSubject` cho `lang-quan-sat` & `exp1_anathema` (timing `immediate`) thiếu kiểm tra `!allPlayers.some(p => isPlayerDormantPendingRevive(state, p))`, cho phép `COPY_GOAL` thắng sole-survivor sớm khi Undead đang ngủ đông chờ hồi sinh.
   - `areAllNeutralsAlive` (dùng cho `Angel`) dùng `w.alive` thay vì `isPlayerLivingOrPendingRevive(state, w)` (không nhất quán với `Bryon`).
   - Các cờ sự kiện phục vụ điều kiện thắng (`charlesKillWon`, `cruzQualifyingCardTurnByPlayer` / `cruzWinTriggeredIds`, `arleneHunterKillTriggeredIds`, `daltonKillWinTriggeredIds`) chỉ kiểm tra `player.roleId` gốc thay vì xét cả người chơi có liên kết `COPY_GOAL` trỏ tới vai đó (`Cassie` / `Clairvoyant` / `Antimony`).
   - Khi `Antimony` sao chép `Bethany` (chưa chọn Chosen) hoặc `Clairvoyant` (chưa soi), `buildVictoryDependencyLinks` chỉ đọc link từ nạn nhân chết mà bỏ qua `bethanyChosenByPlayer[antimony]` / `clairvoyantVisions[antimony]` do chính Antimony kích hoạt về sau.
   - **Determinism hygiene:** `enqueueRoleRevealedTrigger` dùng fallback `Date.now()` tại dòng 1308 thay vì luôn nhận `nowMs` xác định từ call site.
9. **BUG-8B-09 (P0 — Live Deadlock & Rejected-Action State Mutation · `exp2_father_harrison` `ROLL_DICE`) [Phát hiện trực tiếp bởi Stateful Fuzzer & Replay Verifier trên `72595c5`!]:**
   - Trong `features/boardgame/domain/expansion-skills.ts`, `applyExpandedDiceRollMove` phát sự kiện `ON_MOVE` với payload `{ phase: 'dice_move_adjust' }` (để kiểm tra `Fea`). Tuy nhiên `fatherHarrisonSundayServiceHandler` cũng đăng ký `trigger: 'ON_MOVE'` mà **không kiểm tra** `ctx.event.payload?.targetAlias === 'church'`.
   - Hệ quả: bất kỳ khi nào `Father Harrison` đã lộ diện (chưa đứng tại Church) gửi `ROLL_DICE`, `fatherHarrisonSundayServiceHandler.execute()` kích hoạt ngoài ý muốn, dịch chuyển Father Harrison tới Church và đổi `state.turnPhase = 'LOCATION_ACTION'`, ngay sau đó `resolveDiceRollMove` thấy `turnPhase !== 'ROLL_MOVE'` và trả về `{ ok: false, error: 'Hiện không ở pha tung xúc xắc di chuyển.' }`!
   - Trên Cloudflare Durable Object (`boardgame-room.ts`), `res.ok === false` hủy giao dịch không lưu trạng thái → Father Harrison đã lộ diện (ngoài Church) **không bao giờ tung được xúc xắc**; đặc biệt nếu bị `Voodoo` chiếm quyền lượt (vốn cấm `USE_SKILL`), bàn chơi **deadlock 100%** cho đến khi quá hạn lượt! Đồng thời với caller trong tiến trình, lệnh bị từ chối đã đột biến state và phá vỡ tính xác định của replay (`3/40` seed replay fail trên `72595c5`: `88001102`, `88001795`, `88003735`).

### B. Potential Risks (Sẽ kiểm tra sâu bằng Stateful Fuzzer & DO E2E)
- Tương tác nhiều phản ứng nối tiếp (Anathema → Arnold → Undying → Bianca → Cindy → Wendigo → Gideon → Vengeful Spirit → Antimony) dưới tải ngẫu nhiên và timeout.
- Bảo toàn đúng 48 lá bài (`decks + discards + hands + equipped + gloriaQueued + active choice cards`) sau hàng trăm ván có rút lại Felicia/Cruz, Gloria queue, Gideon 3 thẻ Trắng, cướp/thu hồi Colt và loại giữa chừng.
- Ràng buộc `N.C. Soldier` khi `Vengeful Spirit` (Shadow) sao chép kỹ năng `exp2_nc_soldier`: cần kiểm tra để Shadow không tạo liên minh chết vô hiệu hóa điều kiện thắng của Neutral khác.

### C. Intended House-Rule Behaviors (KHÔNG sửa như lỗi)
- Toàn bộ 8 quyết định `house-rule-approved` Phase 7 trong [`phase-7/rules-decisions.md`](../phase-7/rules-decisions.md) (`RC-01..RC-06`, `RC-09`) và các quyết định Phase 2–6 (`RC-13..RC-20`).
- `BOARD_GAME_MAX_EQUIPPED = 99` (không thể chạm trần trong bộ 48 thẻ).
- `Daniel` (`deadCount === 1` khi đồng tử vong) giữ nhất quán với `victory.ts` của Classic.
- `Cindy` khi Bonnie chuyển sang Shadow (còn 0 Neutral khác) chuyển về thắng khi sống sót cuối trận như 5P.

### D. Test Coverage Gaps (Sẽ lấp đầy trong Phase 8B)
- Thiếu bộ kiểm chứng bất biến tái sử dụng (`test/helpers/boardgame-invariants.cjs`) chạy sau MỌI bước chuyển trạng thái.
- Thiếu Stateful Fuzzer tách bạch **Valid Gameplay** vs **Adversarial Input** có **failure shrinking** và **deterministic event replay**.
- Thiếu kiểm thử DO cho kịch bản F5 reconnect ngay khi đang mở `pendingChoice` với `turn_timeout_ms = 0`, cũng như timeout tự động khi `pendingChoice` kết thúc lượt.

### E. Balance Concerns (Chỉ ghi nhận, KHÔNG tự động chỉnh trong Phase 8B)
- Các outlier đã ghi nhận ở [`known-beta-risks.md`](./known-beta-risks.md) (`Anathema`, `Colt`, `N.C. Soldier`, `Undead`, `G43 + Holy Robe`, `Bonnie`). Không chỉnh sửa HP hay điều kiện thắng trong Phase 8B.

### F. Unverified Hypotheses (Sẽ xác minh bằng fuzzer trước khi kết luận)
- Liệu có trường hợp cạn chồng bài (deck + discard = 0) kết hợp `Felicia` / `Cruz` / `Gloria` / `Gideon` gây treo pha `LOCATION_ACTION` hoặc mất thẻ hay không.
- Liệu có trường hợp nhiều `ELIMINATION_TRIGGERS` trong cùng lô AoE kết hợp `Undead` ngủ đông + `Vengeful Spirit` bỏ qua khiến `pendingSteps` không giải phóng hết hay không.
