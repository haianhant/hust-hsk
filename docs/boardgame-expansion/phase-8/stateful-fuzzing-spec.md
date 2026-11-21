# Bóng Đêm KTX — Phase 8B Stateful Fuzzing, Invariants & Deterministic Replay Spec

> **Tệp triển khai:**
> - Bộ kiểm chứng bất biến tái sử dụng: [`test/helpers/boardgame-invariants.cjs`](../../../test/helpers/boardgame-invariants.cjs)
> - Fuzzer trạng thái, Adversarial Fuzzer, Replay Verifier & Shrinker: [`scripts/fuzz-boardgame-stateful.cjs`](../../../scripts/fuzz-boardgame-stateful.cjs)
> - Bộ kiểm thử tự động tích hợp CI: [`test/boardgame-phase8b-stateful-audit.test.cjs`](../../../test/boardgame-phase8b-stateful-audit.test.cjs)

---

## 1. Năm Nhóm Bất Biến Trạng Thái Chính Thức (`checkGameStateInvariants`)

Sau mỗi bước chuyển trạng thái (khởi tạo, hành động người chơi, lựa chọn ngoài lượt, quá hạn tự động, khép ván), bộ kiểm chứng chạy 5 nhóm kiểm tra:

1. **Player State Invariants:**
   - `turnOrder` không trùng lặp, khớp `1:1` với `Object.keys(state.players)` và `seatIndex` duy nhất.
   - Danh tính gốc bất biến (`roleId`, `faction`, `maxHp`, `seatIndex`) không bao giờ trôi khỏi ảnh chụp khởi tạo (`captureInitialIdentitySnapshot`).
   - `0 <= hp <= maxHp`, `0 <= woundsTaken <= maxHp`, `hp + woundsTaken === maxHp`, `maxHp === catalog.maxHp`.
   - `location` luôn nằm trong `BOARD_GAME_VALID_LOCATIONS`.
   - Tính nhất quán vòng đời (`ALIVE` / `REVIVED` / `DORMANT_PENDING_REVIVE` / `FINAL_ELIMINATED`): Classic không bao giờ ngủ đông; người `FINAL_ELIMINATED` phải có `alive = false`, `hp = 0`, `revealed = true`, `hand.length === 0`, `equipped.length === 0`.
   - Chỉ `bonnie_shadow_succession` mới được thay đổi `effectiveFaction` thành `mist-order`.
   - Mọi thẻ trong `equipped` phải là thẻ trang bị không tiêu hao.
2. **Turn State Invariants:**
   - `turnPhase` thuộc `{ ROLL_MOVE, CHOOSE_MOVE, LOCATION_ACTION, MAIN_ACTION, ENDED }`.
   - Khi `finished === true`: `turnPhase === 'ENDED'`, `activePlayerId === null`, không còn `pendingChoice`, `pendingSteps`, hay `activeTurnControl`.
   - Khi chưa kết thúc và không có `pendingChoice`/`pendingSteps`: `activePlayerId` phải còn sống và không ngủ đông.
   - `TurnControlGrant` (Voodoo): đúng `activePlayerId` & `turnNumber`, chưa từng nằm trong `expiredControlGrantIds`, controller & victim đều sống/không ngủ đông, `publicDrawnCardIds` không bao giờ chứa lá `inv-*`.
   - `PendingChoice`: `ownerPlayerId` tồn tại, `options.length >= 1`, `defaultOptionId` nằm trong `options`, `choiceId` chưa từng nằm trong `resolvedChoiceIds`.
3. **Cards & Equipment Conservation Invariants:**
   - Tổng số thực thể thẻ bài trên toàn trạng thái (`decks + discards + hands + equipped + gloriaQueuedCards + in-flight pendingChoice cards`) **luôn bằng đúng `48`** (`EXPECTED_TOTAL_CARDS`), và từng `cardId` giữ đúng số bản sao theo `CARDS_CATALOG` (không nhân bản, không thất lạc).
4. **Victory Invariants:**
   - `winnerPlayerIds` không trùng lặp, mọi ID đều tồn tại, `finalReveal.length === turnOrder.length`.
   - `winnerFaction === 'multi-faction'` phải đi kèm `winningFactions.length >= 2`.
   - Hunter không bao giờ được tuyên thắng tiêu diệt toàn bộ Shadow khi vẫn còn một Shadow ở trạng thái `DORMANT_PENDING_REVIVE` (`Undead`).
5. **Privacy, Projection & Serialization Invariants:**
   - Khi chưa kết thúc trận: mọi người chơi `!revealed` có `revealedRoleId = revealedFaction = revealedMaxHp = null` và `effectiveFaction = copiedSkillRoleId = allianceId = undefined`; `finalReveal === null`.
   - `pendingChoice.isSecret === true` có `ownerPlayerId === null`, `kind === null`, `choiceId` bắt đầu bằng `choice-secret`.
   - `lastInvestigation.cardId === 'inv-00'`; `controlledTurn.publicDrawnCards` không chứa `inv-*`.
   - `angelProtectedPlayerIds` chỉ chứa người chơi đã lộ diện có `getEffectiveFaction === 'wanderer'` (không gắn nhầm lên Bonnie đã chuyển sang Shadow).
   - Cách ly `getPrivateGameView(state, pid)`: không lộ `pendingChoice` hoặc `privateClues` của nạn nhân sang controller `Voodoo`.
   - Khép vòng JSON (`JSON.parse(JSON.stringify(state))`) tạo ra `getPublicGameView` giống hệt từng byte.

---

## 2. Phân tách Rạch ròi Valid Fuzzing vs Adversarial Fuzzing

| Chế độ | Mục đích | Cơ chế xác minh |
|---|---|---|
| **Valid Gameplay Stateful Fuzz** | Quét không gian trạng thái hợp lệ 4P–8P trên cả 4 bộ luật (`classic`, `expansion-1`, `expansion-2`, `full-expansion`) bao gồm cả `CHOICE_TIMEOUT` và `AUTO_TURN_TIMEOUT`. | Sinh hành động hợp lệ theo pha hiện tại, chạy `checkGameStateInvariants` sau **mỗi bước**, và khẳng định mọi hành động bị từ chối (`res.ok === false`) **tuyệt đối không đột biến gameplay state**. |
| **Targeted High-Interaction Roster Fuzz** | Ép xuất hiện liên tục các tổ hợp Tier-4/Tier-3 dễ xung đột (`Voodoo + Father Harrison + Felicia + Gloria + Cruz + Lloyd`, `Undead + Vengeful Spirit + Antimony + Gideon + Cain`, `Anathema + Arnold + Bianca + Wrath + Undying + Usurper`, `Bonnie + Cassie + Diana + Angel + N.C. Soldier + Aaron`). | Áp bộ luật & kiểm chứng bất biến giống Valid Fuzz với xác suất đụng độ chuỗi kỹ năng gấp ~20 lần chia bài ngẫu nhiên. |
| **Adversarial Input Fuzz** | Tiêm liên tục hành động trái phép giữa các bước hợp lệ (sai lượt, người chết/ngủ đông, player ma, giả mạo `choiceId`/`optionId`, phát lại `choiceId` cũ, hành động cấm của Voodoo, tự đánh mình, thẻ không tồn tại). | Khẳng định mọi probe trái phép bị từ chối sạch và **0 đột biến** gameplay state. |
| **Deterministic Event Replay** | Phát lại toàn bộ trace đã ghi từ `seed` và `startMs` ban đầu. | Khẳng định `sha256(JSON.stringify(replayedState)) === originalFinalHash` (`100%` giống hệt từng byte). |
| **Failure Shrinker** | Rút gọn bất kỳ trace lỗi nào thành chuỗi tối thiểu tái lập đúng mã vi phạm. | Tìm kiếm nhị phân theo tiền tố ngắn nhất + loại bỏ từng khối/bước theo delta-debugging (`<= 120` lượt thử). |

---

## 3. Lệnh Chạy Tái Lập

```bash
# Chạy tiêu chuẩn (nhanh ~10–15s):
node scripts/fuzz-boardgame-stateful.cjs --valid=200 --targeted=40 --adversarial=100 --replay=40

# Chạy sâu xác minh trước bản vá (Phase 8B Gate):
node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=80 --adversarial=150 --replay=60
```
