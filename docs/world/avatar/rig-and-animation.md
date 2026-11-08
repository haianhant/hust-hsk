# Đặc tả Module: Hệ Khung xương, Chuyển động & Bảng tên Nhân vật (`Avatar Rig & Animation`)

## 1. Module `avatar.rig` — Hệ Khung xương `FigureJoints` Nam & Nữ

- **Module ID:** `avatar.rig`
- **Purpose:** Cung cấp mô hình nhân vật sinh viên 3D tỉ lệ chuẩn (`~1.707m`), liền mạch ở mọi góc nhìn cho người chơi chính (`Player.tsx`), người chơi trực tuyến (`RemotePlayers.tsx`), NPC cốt truyện (`Npc.tsx`) và quần thể sinh viên sân trường (`AmbientLife.tsx`).
- **Source Paths:**
  - Hình học & Khung xương: `Figure` và `FigureJoints` trong [`components/three/StudentAvatar.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/StudentAvatar.tsx)
  - Giao diện Tùy biến 3D: [`components/ui/CharacterCreatorModal.tsx`](file:///home/bao/Hust3D/hust-hsk/components/ui/CharacterCreatorModal.tsx)
- **Reference Assets:**
  - [`docs/huong-dan-phat-trien.md`](file:///home/bao/Hust3D/hust-hsk/docs/huong-dan-phat-trien.md) §2 và bộ ảnh [`tham-khao/dong-phuc/`](file:///home/bao/Hust3D/hust-hsk/tham-khao/dong-phuc/README.md).
- **Current Implementation Status:** **Production**.
- **Invariants (Ràng buộc Bất biến):**
  1. **Cấu trúc Phân cấp Khớp (`FigureJoints`):**
     - Gồm 11 nút `THREE.Group` có điểm xoay (pivot) đặt đúng tâm giải phẫu: `body` → `armL`/`armR` (vai) → `elbowL`/`elbowR` (khuỷu tay); và `legL`/`legR` (háng) → `kneeL`/`kneeR` (đối) → `footL`/`footR` (cổ chân).
  2. **Triệt tiêu Khe hở Khớp (Ball-Joint Caps & Pelvis Bridge):**
     - Tại gốc `legL`/`legR` có cầu khớp háng (`hip ball-joint`) kết hợp khối nối hông `Pelvis Bridge` dưới đáy thân áo.
     - Tại gối có cầu khớp gối (`knee sphere`), tại cổ chân có cầu khớp cổ chân + cổ tất cao (`high sock cuff`) nhúng sâu vào cổ giày thể thao → **không bao giờ hở khe đùi, gối hay cổ chân** khi bước rộng hoặc ngồi lái xe.
  3. **Phân biệt Hình thể Nam (`male`) & Nữ (`female`):**
     - Cùng chiều cao chuẩn `~1.707m` (đế giày chạm mặt đất `y = 0`), nhưng khác biệt tự nhiên về độ rộng vai, độ thuôn eo/hông, đường nét khuôn mặt (hàng mi, lông mày, sắc môi) và hỗ trợ 6 kiểu tóc (`short`, `swept`, `layered`, `ponytail`, `bob`, `bun`) cao gọn trên lông mày, không che khuất mắt.
- **Acceptance Criteria:**
  - Xoay preview 360° ở cả 3 chế độ `Đứng / Đi bộ / Chạy` trong `CharacterCreatorModal` không thấy bất kỳ khe hở hình học nào tại vai, khuỷu, háng, gối hay cổ chân.
- **Known Limitations:**
  - Biểu cảm khuôn mặt hiện là hình học tĩnh (chưa có morph targets nháy mắt/mấp máy môi khi phát âm TTS).

---

## 2. Module `avatar.animation` — Hệ thống Chuyển động Thủ tục (`Procedural Animation`)

- **Module ID:** `avatar.animation`
- **Purpose:** Điều khiển chuyển động chân thực theo thời gian thực cho các trạng thái đứng nghỉ (`idle`), đi bộ (`walk`), chạy (`run`), ngồi lái xe máy (`riding`) và ngồi ghế đá đọc sách (`SittingStudent`).
- **Source Paths:**
  - Hàm cập nhật khớp: `applyWalkPose`, `applyRidePose` và vòng lặp `useFrame` trong [`components/three/StudentAvatar.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/StudentAvatar.tsx), [`components/three/Player.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Player.tsx), [`components/three/RemotePlayers.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/RemotePlayers.tsx)
- **Current Implementation Status:** **Production**.
- **Invariants:**
  - **Đồng bộ pha bước chân:** Chân trái (`legL`) và tay phải (`armR`) cùng pha tiến/lùi; chân phải (`legR`) và tay trái (`armL`) ngược pha; khớp gối (`kneeL`/`kneeR`) chỉ gập về phía sau trong nửa chu kỳ nhấc chân (`Math.max(0, ...)`), tuyệt đối không bẻ ngược gối về phía trước.
  - **Chống trượt chân & Chống chạy tại chỗ:** Biên độ sải chân tỉ lệ thuận với vận tốc thực tế sau khi đã giải quyết va chạm (`resolveCollisions`). Khi nhân vật chạm tường/vật cản và không dịch chuyển được, biên độ bước tự động giảm về trạng thái đứng nghỉ (`idle`).
  - **Tư thế lái xe máy (`riding = true`):** Hông hạ xuống yên xe, hai đùi mở nhẹ ôm thân xe, gối gập góc ngồi và hai tay vươn nắm đúng ghi-đông xe máy.

---

## 3. Module `avatar.nameplate` — Bảng Tên Sinh viên Trên Đầu

- **Module ID:** `avatar.nameplate`
- **Purpose:** Hiển thị tên sinh viên (tiếng Việt có dấu, mặc định `"Sinh viên"`) và mã số sinh viên `"Tên (MSSV)"` rõ nét phía trên đầu nhân vật.
- **Source Paths:**
  - [`components/three/Player.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Player.tsx), [`components/three/RemotePlayers.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/RemotePlayers.tsx), [`components/three/Npc.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Npc.tsx)
- **Current Implementation Status:** **Production**.
- **Invariants:**
  - Sử dụng `<Billboard>` đặt **bên ngoài** group chịu phép xoay `facing` của nhân vật để bảng tên luôn hướng thẳng về phía camera, không bao giờ bị đọc ngược và không bị rung giật theo nhịp nhún bước chân (`body.position.y`).
  - `CanvasTexture` của bảng tên phải được gọi `.dispose()` trong `useEffect` cleanup mỗi khi người chơi đổi tên hoặc rời phòng.
