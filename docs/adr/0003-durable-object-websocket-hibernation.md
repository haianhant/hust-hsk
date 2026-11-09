# ADR-0003: Phục hồi Phiên WebSocket Hibernation trên Cloudflare Durable Object

- **Trạng thái:** Đã chấp thuận & Triển khai tại `PR1` (08/11/2026)
- **Bối cảnh:**
  - Dịch vụ Multiplayer ([`worker/src/room.ts`](../../worker/src/room.ts)) sử dụng Cloudflare Durable Object WebSocket Hibernation API (`this.ctx.acceptWebSocket(server)`) để giảm chi phí duy trì kết nối khi các sinh viên đứng yên đọc bài hoặc học từ vựng.
  - Khi Durable Object rơi vào trạng thái ngủ đông (hibernation), toàn bộ biến trạng thái trong RAM (`this.sessions` và `this.bySocket`) bị giải phóng.
  - Trước `PR1`, server chỉ lưu `{ id: sessionId }` vào `ws.serializeAttachment(...)` lúc `join` và không có logic khôi phục `this.sessions` từ `this.ctx.getWebSockets()` khi DO thức dậy. Hậu quả là sau mỗi đợt hibernation, mọi bản tin `move`/`state`/`appearance` của người chơi đang kết nối đều bị rơi vào nhánh `if (!player) return` và bị bỏ qua.
- **Quyết định:**
  1. Định nghĩa cấu trúc [`SocketAttachment`](../../worker/src/room.ts#L31-L48) chứa đầy đủ thông tin phiên của người chơi (`id`, `roomId`, `name`, `mssv`, `color`, `x`, `z`, `facing`, `state`, ngoại hình và `lastUpdate`).
  2. Gọi `ws.serializeAttachment(...)` thông qua phương thức [`persistSocketAttachment`](../../worker/src/room.ts#L71-L97) mỗi khi trạng thái người chơi thay đổi (`join`, `move`, `state`, `appearance`).
  3. Thực thi [`restoreHibernatedSessions`](../../worker/src/room.ts#L99-L133) tại điểm vào của `constructor`, `fetch`, `webSocketMessage`, `webSocketClose` và `webSocketError` để quét `this.ctx.getWebSockets()` và tái tạo đầy đủ `this.sessions` / `this.bySocket` nếu bộ nhớ vừa bị xóa sau hibernation.
- **Hệ quả:**
  - Không phát sinh chi phí đọc/ghi Durable Object Transactional Storage (`this.ctx.storage.put`), độ trễ bằng 0 và đảm bảo các phòng học/sân trường giữ nguyên danh sách người chơi ngay cả sau khi ngủ đông dài hạn.
