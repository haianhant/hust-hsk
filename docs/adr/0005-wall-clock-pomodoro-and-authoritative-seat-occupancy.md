# ADR-0005: Đồng hồ Pomodoro theo Mốc Thời gian Thực & Quản lý Chỗ ngồi Authoritative

- **Trạng thái:** Đã chấp thuận (`PR6`)
- **Ngày:** 08/11/2026
- **Module liên quan:** `feature.study.pomodoro`, `feature.study.session`, `feature.study.focus-mode`, `feature.social.study-rooms`, `feature.social.presence`

---

## 1. Bối cảnh (Context)

Khi mở rộng **Bách khoa Hán ngữ 3D (`hust-hsk`)** thành không gian tự học ảo (**HUST Virtual Study Campus**), hệ thống cần hỗ trợ:
1. Đồng hồ **Pomodoro Timer** và **Phiên tự học (`Study Session`)** kết hợp linh hoạt với việc học từ vựng HSK 3–4.
2. **Chế độ Tập trung (`Focus Mode`)** có thể chạy mượt trên cả thiết bị yếu hoặc khi người học ẩn tab trình duyệt, tắt hoàn toàn kết xuất WebGL 3D.
3. **Phòng tự học chung (`Study Rooms`)** và **Chiếm giữ chỗ ngồi (`Seat Occupancy`)** tại Thư viện Tạ Quang Bửu, Phòng học C1 và bờ Hồ Tiền mà không gây xung đột trạng thái khi hai sinh viên cùng bấm vào một ghế hoặc khi Cloudflare Durable Object ngủ đông (`WebSocket Hibernation`).

---

## 2. Quyết định Kiến trúc (Decision)

1. **Tính thời gian Pomodoro hoàn toàn bằng Mốc Thời gian Thực (`Wall-Clock Epoch Timestamps`):**
   - Trong [`features/study/pomodoro/timer.ts`](file:///home/bao/Hust3D/hust-hsk/features/study/pomodoro/timer.ts), trạng thái đồng hồ lưu `phaseStartedAtMs` và `phaseEndsAtMs` (hoặc `pausedRemainingMs` khi tạm dừng).
   - Tuyệt đối không dùng biến đếm lùi cộng dồn theo mỗi tick của `setInterval` hay `useFrame`. Hàm thuần [`evaluatePomodoroAt(state, nowMs)`](file:///home/bao/Hust3D/hust-hsk/features/study/pomodoro/timer.ts#L172-L273) tính toán thời gian còn lại trực tiếp từ `nowMs` và tự động chuyển pha nhiều bước nếu tab bị đóng/ẩn trong thời gian dài.
2. **Tách biệt Chế độ Tập trung Khỏi WebGL (`FocusRuntimePolicy`):**
   - Trong [`features/study/focus-mode/focus-mode.ts`](file:///home/bao/Hust3D/hust-hsk/features/study/focus-mode/focus-mode.ts), mức `'zen-2d'` đặt `suspend3DRendering = true` nhưng luôn giữ `allowLearningAndPomodoro = true`, đảm bảo tính năng tự học và ôn tập HSK không phụ thuộc vào vòng lặp WebGL.
3. **Ranh giới Cứng giữa `Session State` (Cá nhân) và `Room State` (Chia sẻ Authoritative):**
   - Tiến độ HSK (`bkhn_hsk3_progress_v1`) và phiên tự học cá nhân (`bkhn_study_session_v1`) nằm hoàn toàn ở phía client.
   - Quyền chiếm giữ ghế (`SeatOccupancy` trong [`features/social/rooms/seat-manager.ts`](file:///home/bao/Hust3D/hust-hsk/features/social/rooms/seat-manager.ts)) do server kiểm soát: mỗi người chơi chỉ giữ tối đa 1 ghế; khi đổi ghế thì ghế cũ được giải phóng nguyên tử (`atomic switch`); khi mất kết nối hoặc khi khôi phục từ `SocketAttachment` sau DO Hibernation (`restoreSeatRegistryFromAttachments`), trạng thái ghế luôn nhất quán.

---

## 3. Hệ quả (Consequences)

- **Tích cực:**
  - Toàn bộ logic Pomodoro, Study Session, Focus Mode, Seat Occupancy và Player Presence là các hàm thuần TypeScript có thể kiểm thử đơn vị 100% trên Node.js (`test/study-social-contracts.test.cjs`) với thời gian chạy `< 10ms`.
  - Module HSK 3–4 hiện có (`45/45` unit tests) được bảo toàn tuyệt đối, không bị thay thế hay làm phức tạp hóa.
- **Giới hạn có chủ đích:**
  - Không triển khai hệ thống tài khoản đăng nhập bắt buộc, cơ sở dữ liệu ngoài hay voice chat nhằm giữ kiến trúc tĩnh (`Next.js static export`) + Cloudflare Worker gọn nhẹ.
