# Bóng Đêm KTX — Phase 8C Structured Visual Events Architecture Spec

> **Mục tiêu:** Thay thế dần cơ chế suy diễn VFX mong manh dựa trên chuỗi log tiếng Việt (`log.text.includes(...)`) bằng luồng sự kiện hình ảnh **có kiểu tĩnh (`BoardGameStructuredVisualEvent`)**, **xác định (deterministic)**, **an toàn bảo mật P0 (zero hidden-role leak)**, **giới hạn bộ đệm**, và **tương thích ngược 100%** với client cũ cũng như ảnh chụp trận đấu cũ.

---

## 1. Hợp đồng Dữ liệu (`shared/contracts/boardgame.ts`)

Trường mới trên `BoardGamePublicGameView` hoàn toàn **tùy chọn** (`visualEvents?: readonly BoardGameStructuredVisualEvent[]`) để client cũ không bao giờ lỗi parse và các trận lưu trong SQLite trước Phase 8C tự động rơi về nhánh tương thích ngược.

### 21 Loại Sự kiện Công khai (`BoardGameStructuredVisualEventKind`)

| Nhóm | Kinds |
|---|---|
| **Chiến đấu & Sát thương** | `ATTACK_DECLARED`, `ATTACK_HIT`, `ATTACK_MISSED`, `ATTACK_CANCELLED`, `DAMAGE_APPLIED`, `DAMAGE_PREVENTED`, `DAMAGE_REDIRECTED` |
| **Hồi máu & Trang bị** | `HEAL_APPLIED`, `HEAL_BLOCKED`, `EQUIPMENT_TRANSFERRED` |
| **Vai trò & Kỹ năng** | `ROLE_REVEALED`, `SKILL_ACTIVATED`, `COPY_SKILL_APPLIED` |
| **Cơ chế Tier-4 & Trạng thái** | `TURN_HIJACK_STARTED`, `TURN_HIJACK_ENDED`, `PLAYER_DORMANT`, `PLAYER_REVIVED`, `FACTION_CHANGED`, `PLAYER_RECRUITED` |
| **Loại & Kết thúc** | `ELIMINATION`, `MATCH_FINISHED` |

### Cấu trúc Trường An toàn (`BoardGameStructuredVisualEvent`)

```ts
export interface BoardGameStructuredVisualEvent {
  readonly id: string;            // Ổn định, đơn điệu theo trận: `${matchId}:ve:${seq}`
  readonly seq: number;           // Số thứ tự tăng nghiêm ngặt (>= 1)
  readonly matchId: string;
  readonly round: number;
  readonly turnNumber: number;
  readonly atMs: number;
  readonly kind: BoardGameStructuredVisualEventKind;
  readonly effectKey: string;     // Ví dụ: 'lloyd_interrupt', 'voodoo_hijack_start', 'anathema_redirect'
  readonly actorPlayerId: string | null;
  readonly targetPlayerIds: readonly string[];
  readonly visibility: 'public';
  readonly publicRoleId?: BoardGameRoleId | null;       // CHỈ điền khi actor.revealed || state.finished
  readonly publicFaction?: BoardGameFactionId | null;   // CHỈ điền khi actor.revealed || state.finished
  readonly publicCopiedRoleId?: BoardGameRoleId | null; // CHỈ điền khi actor.revealed || state.finished
  readonly amount?: number;
  readonly isCritical?: boolean;
  readonly isMultiTarget?: boolean;
  readonly outcome?: 'success' | 'failed' | 'blocked' | 'cancelled';
  readonly winningFactions?: readonly BoardGameFactionId[];
  readonly cardCount?: number;
  readonly label?: string;        // Nhãn công khai ngắn gọn (VD: 'CANCELLED', 'NGỦ ĐÔNG', '+6 HP')
}
```

---

## 2. Rào chắn Bảo mật P0 (Central Privacy Gate)

Hàm phát sự kiện duy nhất [`features/boardgame/domain/visual-events.ts`](../../../features/boardgame/domain/visual-events.ts) (`appendStructuredVisualEvent`) thực thi cưỡng bức các bất biến sau:

1. **Chặn rò rỉ vai ẩn tại nguồn:** Nếu `actorPlayerId` trỏ tới người chơi `!actor.revealed && !state.finished`, bộ phát **bắt buộc xóa** `publicRoleId`, `publicFaction`, và `publicCopiedRoleId` (không bao giờ tin cậy caller).
2. **Chặn rò rỉ phản ứng bí mật / thẻ kín:** Không bao giờ phát `BoardGameStructuredVisualEvent` khi một vai ẩn từ chối hoặc bỏ qua phản ứng bí mật (`Undying`, `Wendigo`, `Cindy`, `Urban Legend`, `Usurper`, `Arnold`, `Vengeful Spirit`), khi soi `Clairvoyant`, hoặc khi rút thẻ điều tra `inv-*`.
3. **Bộ đệm có giới hạn:** `BOARD_GAME_MAX_VISUAL_EVENTS = 48` (xoay vòng FIFO, đồng nhất với `publicLog` giới hạn 40), ngăn phình payload `BG_STATE_SYNC` và SQLite.
4. **Không chạm PRNG:** Tuyệt đối không gọi `nextRandomInt` hay sửa `state.rngState` → bảo toàn 25/25 Classic RNG fingerprints.

---

## 3. Chiến lược Chống Phát Lại Khi F5 / Reconnect & Tương Thích Ngược

- Khi `VisualEventTracker.seedBaseline(publicGame, ctx)` chạy lúc mới vào bàn giữa trận hoặc F5 reconnect:
  - Đánh dấu ngay toàn bộ `ev.id` đang nằm trong `publicGame.visualEvents` vào `seenIds` (lưu `sessionStorage` theo `matchId`) và ghi nhận `lastStructuredSeq`.
  - Kết quả: **0 animation cũ** và **0 âm thanh cũ** bị phát lại sau F5 / reconnect!
- Khi `extractVisualEventsFromDiff(prev, next, ctx)` chạy:
  - Lọc các `next.visualEvents` có `seq > prevMaxSeq` (chưa thấy).
  - Nếu có structured events mới: chuyển đổi trực tiếp sang `BoardGameVisualEvent[]` theo ánh xạ có kiểu (ưu tiên 100%, chống trùng tuyệt đối với nhánh log cũ cho cùng sự kiện).
  - Nếu `next.visualEvents` vắng mặt (snapshot cũ / bài test legacy): rơi tự động sang nhánh `publicLog` cũ mà không gãy bất kỳ bài test nào hiện hữu.
