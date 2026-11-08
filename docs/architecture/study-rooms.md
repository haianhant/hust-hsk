# Kiến trúc Phòng Tự học & Chiếm chỗ Ghế Có Thẩm quyền Server (`Study Rooms & Authoritative Seat Occupancy`)

## 1. Phạm vi & Quyết định Kiến trúc (`Instance-Scoped Seat Ownership`)

Hệ thống Multiplayer của **Bách khoa Hán ngữ 3D** gồm 5 phòng độc lập (`hsk-1`, `hsk-2`, `hsk-3`, `hsk-4`, `hsk-5`), mỗi phòng có sức chứa tối đa `15` sinh viên và được quản lý bởi một thực thể Cloudflare Durable Object [`HskRoom`](../../worker/src/room.ts) riêng biệt.

### Quyền sở hữu ghế theo từng phòng (`Per-Room Instance Scope`)
- Quyền giữ chỗ ghế (`SeatOccupancy`) có **thẩm quyền tuyệt đối trong phạm vi từng phòng `HskRoom` (`hsk-1`..`hsk-5`)**, không khóa chéo toàn cục giữa 5 phòng:
  - Sinh viên A giữ ghế `tqb-1f-t1-s1` trong phòng `hsk-1` → Sinh viên B trong cùng phòng `hsk-1` **không thể** chiếm ghế `tqb-1f-t1-s1`.
  - Sinh viên C trong phòng `hsk-2` có thể ngồi ghế `tqb-1f-t1-s1` của phòng `hsk-2` hoàn toàn độc lập.
- Thiết kế này giúp tận dụng trực tiếp `HskRoom` Durable Object hiện có mà không cần thêm tầng điều phối khóa phân tán liên phòng.

### Phạm vi vật lý trong `PR9` (`Physical Scope`)
- Danh mục [`STUDY_SEATS`](../../shared/contracts/study.ts) định nghĩa các ghế tự học chuẩn hóa. Trong `PR9`, cơ chế giữ chỗ qua mạng chỉ kích hoạt cho **4 ghế bàn đọc tại Sảnh tầng 1 Thư viện Tạ Quang Bửu (`zoneId: 'library-lobby'`)**:
  - `tqb-1f-t1-s1` — Bàn đọc Tây 1 · Ghế A `(-2.4, 1.2, facing = 0)`
  - `tqb-1f-t1-s2` — Bàn đọc Tây 1 · Ghế B `(-1.9, 2.3, facing = π)`
  - `tqb-1f-t2-s1` — Bàn đọc Đông 2 · Ghế A `(1.9, 1.2, facing = 0)`
  - `tqb-1f-t2-s2` — Bàn đọc Đông 2 · Ghế B `(2.4, 2.3, facing = π)`
- Các phân khu tự học tương lai (`library-reading-3f`, `c1-classroom-101`, `tien-lake-pavilion`) chưa mở tương tác 3D trong `PR9` và được lọc qua `PR9_SUPPORTED_STUDY_ROOM_ZONES = ['library-lobby']` (`reason: 'unsupported-zone'`).

---

## 2. Nguồn Sự thật Hợp đồng & Sổ đăng ký Ghế

1. **[`shared/contracts/study.ts`](../../shared/contracts/study.ts):**
   - Khai báo `STUDY_SEATS`, `PR9_SUPPORTED_STUDY_ROOM_ZONES`, `SeatOccupancy`, `PlayerStudyPresence`, `SeatClaimRejectionReason` và các bộ lọc bảo mật (`sanitizeSeatOccupancy`, `sanitizePlayerStudyPresence`, `sanitizeRequestId`, `MAX_STUDY_WS_PAYLOAD_BYTES = 2048`).
2. **[`features/social/rooms/seat-manager.ts`](../../features/social/rooms/seat-manager.ts):**
   - Cung cấp các hàm thuần bất biến dùng chung cho cả Cloudflare Worker và Frontend:
     - `createSeatRegistry('library-lobby')`
     - `claimSeat(registry, request, nowMs)` (xử lý idempotent re-claim, tự động chuyển ghế `switchedFromSeatId`, và từ chối `seat-taken` kèm tên người đang ngồi)
     - `releaseSeat(registry, seatId, occupantId)` & `releaseSeatByOccupant(registry, occupantId)`
     - `updateOccupantMetaInSeatRegistry(registry, occupantId, meta)`
     - `restoreSeatRegistryFromAttachments(registry, attachments)`
3. **[`features/social/presence/presence.ts`](../../features/social/presence/presence.ts):**
   - Cung cấp `derivePlayerPresence` (suy dẫn trạng thái công khai từ phiên Pomodoro), `reconcileServerPresenceWithSeat` (đảm bảo `seatId` trên server luôn khớp tuyệt đối với `seatRegistry`) và `formatPresenceBadge` (hiển thị nhãn tiếng Việt).

---

## 3. Giao thức Bản tin WebSocket Phòng Tự học (`Study Room Wire Protocol`)

Các bản tin mở rộng được khai báo tại [`shared/contracts/multiplayer.ts`](../../shared/contracts/multiplayer.ts):

### Client → Server (`HskRoom`)
| Loại bản tin (`type`) | Payload | Mô tả |
|---|---|---|
| `study:claim-seat` | `{ type: 'study:claim-seat', seatId, requestId?, subjectTag? }` | Yêu cầu giữ chỗ một ghế trong `library-lobby`. |
| `study:release-seat` | `{ type: 'study:release-seat', seatId?, requestId? }` | Yêu cầu trả ghế đang ngồi (khi đứng dậy, rời sảnh hoặc kết thúc phiên học). |
| `study:presence` | `{ type: 'study:presence', presence: { status, zoneId, seatId, subjectTag, pomodoroPhase, updatedAtMs } }` | Cập nhật trạng thái học tập công khai khi có thay đổi rời rạc (bắt đầu/tạm dừng/chuyển pha Pomodoro, đổi môn học). |

### Server (`HskRoom`) → Client
| Loại bản tin (`type`) | Payload | Mô tả |
|---|---|---|
| `study:room-snapshot` | `{ type: 'study:room-snapshot', roomId, seats: Record<string, SeatOccupancy>, presences: Record<string, PlayerStudyPresence>, revision }` | Gửi ngay sau `welcome` khi vào phòng hoặc kết nối lại để đồng bộ toàn bộ ghế và trạng thái tự học. |
| `study:seat-claimed` | `{ type: 'study:seat-claimed', seat: SeatOccupancy, previousSeatId?: string | null, revision, requestId? }` | Phát quảng bá cho cả phòng khi một ghế được giữ chỗ hợp lệ (hoặc chuyển từ `previousSeatId`). |
| `study:seat-released` | `{ type: 'study:seat-released', seatId, occupantId, reason?: 'manual' | 'switched-seat' | 'disconnect', revision, requestId? }` | Phát quảng bá khi ghế được trả tự nguyện, do đổi ghế hoặc do mất kết nối. |
| `study:seat-rejected` | `{ type: 'study:seat-rejected', seatId, reason, occupiedBy?: { occupantId, occupantName } | null, revision, requestId? }` | Chỉ gửi riêng cho client yêu cầu khi ghế đã có người ngồi (`seat-taken`), sai mã ghế (`invalid-seat`), phân khu chưa mở (`unsupported-zone`) hoặc chưa đăng nhập (`unauthorized`). |
| `study:presence` | `{ type: 'study:presence', playerId, presence: PlayerStudyPresence, revision }` | Phát quảng bá khi trạng thái tự học công khai của một sinh viên thay đổi. |

---

## 4. Máy Trạng thái Giữ chỗ ở Client & Chế độ Ngoại tuyến

Trong [`app/page.tsx`](../../app/page.tsx) và [`features/campus/buildings/library/StudyChair.tsx`](../../features/campus/buildings/library/StudyChair.tsx), mỗi ghế có 5 trạng thái hiển thị trực quan:

1. **`available` (Ghế trống):**
   - Đệm ghế xanh dương HUST; khi đứng gần `<= 1.65m` hiển thị gợi ý **`"E — Ngồi học"`**.
2. **`pending` (Đang giữ chỗ trên Server):**
   - Khi đang kết nối Multiplayer (`mpStatus.state === 'online'`), thao tác bấm `E` hoặc click ghế gửi `study:claim-seat` và chuyển ghế sang trạng thái `pending` (**`"⏳ Đang giữ chỗ..."`**) trong tối đa `2500ms`.
   - Nhân vật chưa khóa vào ghế cho tới khi nhận `study:seat-claimed` từ server (hoặc hết thời gian chờ sẽ báo lỗi và giữ nguyên tư thế đứng).
3. **`occupied-self` (Bạn đang ngồi):**
   - Vòng sáng xanh ngọc quanh chân ghế, nhân vật ngồi đúng tọa độ/hướng ghế, gắn `seatId` vào `StudySessionState`.
4. **`occupied-other` (Sinh viên khác đang ngồi):**
   - Vòng chỉ báo màu hổ phách quanh ghế; [`RemoteStudySeats.tsx`](../../features/social/rooms/RemoteStudySeats.tsx) dựng mô hình 3D sinh viên đang ngồi kèm bảng tên `<Billboard>` trên đầu:
     - Dòng 1: `"<Tên sinh viên> · 🔒 Đã có người ngồi"`
     - Dòng 2: `"🍅 Đang tự học · <Môn học>"` / `"☕ Giải lao · <Môn học>"` / `"🪑 Đang ngồi · Sảnh tầng 1 — Thư viện Tạ Quang Bửu"`
   - Nếu người chơi khác tiến lại gần hoặc click vào ghế, HUD hiển thị **`"🔒 Ghế đang có người ngồi — hãy chọn ghế khác"`** và bật thông báo tiếng Việt thân thiện mà không dịch chuyển nhân vật.
5. **`offline-self` (Ngồi cục bộ khi ngoại tuyến):**
   - Khi không kết nối được WebSocket (`mpStatus.state !== 'online'`), người chơi vẫn ngồi học cục bộ ngay lập tức và giao diện hiển thị rõ nhãn **`"Chế độ ngoại tuyến (chỉ hiển thị cục bộ)"`**.

---

## 5. Bảo toàn Trạng thái Qua WebSocket Hibernation (`Durable Object Recovery`)

Trong [`worker/src/room.ts`](../../worker/src/room.ts):
- Mỗi kết nối WebSocket lưu kèm `seatId`, `occupiedAtMs`, `studyPresence` và `studyRevision` trong [`SocketAttachment`](../../worker/src/room.ts) qua `ws.serializeAttachment(...)`.
- Khi `HskRoom` thức dậy sau trạng thái ngủ đông (`restoreHibernatedSessions`), server:
  1. Khôi phục `this.sessions` và `this.bySocket` từ `this.ctx.getWebSockets()`.
  2. Khôi phục `this.seatRegistry` bằng `restoreSeatRegistryFromAttachments(...)`.
  3. Khôi phục `this.presences` và đối chiếu chéo với `this.seatRegistry` qua `reconcileServerPresenceWithSeat(...)`.
  4. Khôi phục bộ đếm `this.studyRevision` để các bản tin tiếp theo luôn có số thứ tự tăng đơn điệu.

---

## 6. Ranh giới Quyền riêng tư (`Privacy Boundaries`)

- **Dữ liệu ĐƯỢC phép phát quảng bá trong phòng tự học:**
  - `occupantId` (`sessionId` ngẫu nhiên của phiên), `occupantName` (đã lọc qua `sanitizeName`), trang phục 3D (`RemoteAppearance`), `seatId`, `zoneId`, `status` (`exploring | studying | break | idle`), `pomodoroPhase`, và `subjectTag` (tối đa `60` ký tự, đã lọc ký tự điều khiển).
- **Dữ liệu TUYỆT ĐỐI KHÔNG truyền qua bản tin phòng tự học:**
  - Mã số sinh viên (`MSSV`) không bao giờ xuất hiện trong `SeatOccupancy`, `PlayerStudyPresence` hay bảng tên 3D trong sảnh tự học.
  - Danh sách công việc cá nhân (`tasks`), lịch sử số vòng Pomodoro hoàn thành, tiến độ SRS, câu trả lời HSK và dữ liệu `localStorage` cá nhân hoàn toàn giữ riêng trên máy người học.
