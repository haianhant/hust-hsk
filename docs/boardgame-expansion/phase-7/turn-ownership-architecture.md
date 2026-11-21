# Kiến trúc `TurnOwnershipOverride` (Phase 7A — Voodoo Security Gate)

> **Module Chính:** [`features/boardgame/domain/turn-ownership.ts`](../../../features/boardgame/domain/turn-ownership.ts)  
> **Điểm tích hợp:** [`actions.ts`](../../../features/boardgame/domain/actions.ts), [`projections.ts`](../../../features/boardgame/domain/projections.ts), [`worker/src/boardgame-room.ts`](../../../worker/src/boardgame-room.ts)

---

## 1. Phân tách 5 Định danh Bất biến

Hệ thống tuyệt đối **không** đồng nhất người gửi lệnh với chủ lượt hoặc chủ thông tin bí mật:

| Định danh | Ý nghĩa | Thay đổi khi bị Voodoo chiếm quyền? |
|---|---|---|
| `activePlayerId` | Người chơi đang giữ vị trí lượt trên `turnOrder` | **KHÔNG** (vẫn là nạn nhân) |
| `controllerPlayerId` | Người chơi tạm thời được phép gửi lệnh công khai | **CÓ** (`voodooPlayerId` trong đúng 1 lượt) |
| `actingPawnPlayerId` | Quân cờ nhận di chuyển, rút bài địa điểm, tấn công | **KHÔNG** (`=== activePlayerId`) |
| `privateInformationOwnerId` | Chủ sở hữu vai ẩn, bài trên tay, manh mối, secret choice, reconnectToken | **KHÔNG** (`=== activePlayerId`) |
| `controlGrantId` | Mã ủy quyền đơn điệu duy nhất `tcg-<turn>-<seq>-<ms>` | Tạo mới cho từng lượt, ghi vào `expiredControlGrantIds` khi đóng |

---

## 2. Bảng Phân quyền Lệnh (`resolveTurnCommandAuthority`)

| Loại hành động (`BoardGameActionPayload['type']`) | `controllerPlayerId` (Voodoo) | `activePlayerId` (Nạn nhân) | Ghi chú Bảo mật |
|---|---|---|---|
| `ROLL_DICE`, `CHOOSE_DEST`, `DRAW_CARD`, `USE_LOC_POWER`, `SKIP_LOC`, `ATTACK`, `END_TURN` | **ĐƯỢC PHÉP** (trừ khi tạm dừng cho thẻ Điều tra) | **BỊ CHẶN** (`CONTROLLED_BY_OTHER`) | Tác động lên `actingPawnPlayerId`, bảo toàn vòng lượt |
| `EQUIP_CARD`, `USE_CARD` (chỉ thẻ Trắng/Đen `eq-*`, `ev-*` rút công khai trong lượt) | **ĐƯỢC PHÉP** | **BỊ CHẶN** | Nếu gửi `cardId` bắt đầu bằng `inv-` → **TỪ CHỐI CỨNG** |
| `INVESTIGATE_CARD` | **CẤM TUYỆT ĐỐI** (`PROHIBITED_CONTROLLER_ACTION`) | **ĐƯỢC PHÉP** khi trên tay có thẻ `inv-*` | Kích hoạt `pausedForOwnerDecision = true` tạm dừng quyền công khai của Voodoo |
| `REVEAL_ROLE`, `USE_SKILL`, `TRANSFER_TO_BETHANY` | **CẤM TUYỆT ĐỐI** (`PROHIBITED_CONTROLLER_ACTION`) | **BỊ CHẶN** khi đang bị chiếm quyền | Ngăn Voodoo ép lộ vai hoặc xả kỹ năng của nạn nhân |
| `RESOLVE_CHOICE` | Chỉ hợp lệ nếu `pendingChoice.ownerPlayerId === sender` | Chỉ hợp lệ nếu `pendingChoice.ownerPlayerId === victim` | Không bao giờ ủy quyền PendingChoice sang người khác |
| `SET_REACTION_PREF` | Chỉ cập nhật cho chính tài khoản gửi | Chỉ cập nhật cho chính tài khoản gửi | Riêng tư hoàn toàn (unicast, không tăng revision) |

---

## 3. Vòng đời, Hết hạn, Chống Phát lại & An toàn Rớt mạng

1. **Lên lịch (`PENDING_NEXT_TURN`):** Đầu lượt Voodoo, `scheduleDeferredTurnControl` gắn grant vào `pendingTurnControlGrants` (tiêu hao charge 1 lần của Voodoo ngay lập tức).
2. **Kích hoạt (`ACTIVE`):** Khi `advanceTurn` chuyển tới lượt tiếp theo của nạn nhân, `activateScheduledTurnControlForTurn` kiểm tra cả controller lẫn nạn nhân đều còn sống & không ngủ đông. Nếu một trong hai đã chết/ngủ đông → chuyển `CANCELLED` và không chuyển sang người thứ ba.
3. **Cô lập Projection (`projections.ts`):**
   - `getPublicGameView` chỉ xuất `controlledTurn: { controlGrantId, activePlayerId, controllerPlayerId, pausedForOwnerDecision, publicDrawnCards }` — lọc sạch mọi lá `inv-*`, không lộ vai ẩn.
   - `getPrivateGameView(state, voodooId)` chỉ chiếu trạng thái của chính `voodooId`, gắn cờ `isControllingActiveTurn: true`, tuyệt đối không bao giờ đọc `victim.roleId`, `victim.hand`, `victim.privateClues`, hay `reconnectToken`.
4. **Hết hạn & Chống phát lại (`EXPIRED` / `CANCELLED`):**
   - Tự động hết hạn khi kết thúc lượt, khi trận kết thúc, khi 1 trong 2 người chết/ngủ đông, hoặc khi `applyTimeoutAutoTurn` chạy.
   - `controlGrantId` được đẩy vào `expiredControlGrantIds` (tối đa 64 mã gần nhất); `isControlGrantValidAndNotReplayed` từ chối mọi mã đã hết hạn.
5. **Tích hợp Cloudflare Durable Object (`worker/src/boardgame-room.ts`):**
   - `getEffectiveTurnControllerId(engineState)` được dùng thống nhất ở `webSocketClose`, `handleLeave`, `handleJoin` (reconnect), `alarm()` và `computeNextTurnDeadline`.
   - Nếu Voodoo rớt mạng giữa lượt chiếm quyền, đồng hồ tự giới hạn theo `BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS` và `alarm()` hoàn tất lượt an toàn + hủy grant — đảm bảo không bao giờ treo bàn.
6. **Bất biến Classic:** Trong chế độ `classic`, `getActiveTurnControlGrant` luôn trả về `null`; quyền gửi lệnh giữ nguyên tuyệt đối `senderPlayerId === state.activePlayerId`.
