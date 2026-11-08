# Hệ thống Tương tác & Điều khiển (`Interaction System`)

## 1. Luồng Điều khiển Đa Phương thức (PC & Mobile)

Người chơi điều khiển nhân vật thông qua 2 nguồn đầu vào hợp nhất vào `playerInput` và `bikeInput` tại [`lib/playerState.ts`](file:///home/bao/Hust3D/hust-hsk/lib/playerState.ts):

| Hành động | Máy tính (PC) | Điện thoại / Cảm ứng (Mobile) |
|---|---|---|
| Di chuyển / Lái xe | `W / A / S / D` hoặc phím mũi tên | Cần gạt ảo `Joystick` góc dưới trái / cụm nút Ga-Phanh-Lái |
| Chạy nhanh | Giữ `Shift` | Tự động khi kéo `Joystick` sát biên ngoài |
| Xoay góc nhìn Camera | Kéo chuột trái trên màn hình | Vuốt vùng nửa phải màn hình |
| Tương tác / Lên xuống xe | Phím `E` hoặc Click trực tiếp vào vật thể 3D | Nút `"Tương tác (E)"` nổi trên HUD |
| Mở Bản đồ Toàn cảnh | Phím `M` | Nút phóng to trên khung `Minimap` |

### Cơ chế Khóa Đầu vào (`playerState.uiLocked`)
- Khi bất kỳ hộp thoại nhiệm vụ (`QuestPanel`), Sổ tay (`Handbook`), Phiên ôn tập (`ReviewSession`), hay Khung tạo nhân vật (`CharacterCreatorModal`) đang mở, [`app/page.tsx`](file:///home/bao/Hust3D/hust-hsk/app/page.tsx) đặt `playerState.uiLocked = true`.
- Trong trạng thái `uiLocked = true`, [`Player.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Player.tsx) bỏ qua toàn bộ phím di chuyển `WASD` và không gọi `event.preventDefault()`, đảm bảo người học gõ câu trả lời tiếng Trung hoặc Pinyin (kể cả các chữ cái `a`, `w`, `s`, `d`, `e`, `m`) vào ô `<input>` hoàn toàn bình thường.

---

## 2. Phát hiện Tương tác theo Bán kính Lân cận (`Proximity Interaction`)

Mỗi `200ms` (và ngay khi nhận sự kiện `CustomEvent('bkhn:interact')` từ phím `E`), [`app/page.tsx`](file:///home/bao/Hust3D/hust-hsk/app/page.tsx) đối chiếu tọa độ `playerState.pos` với danh sách các điểm tương tác trong không gian hiện tại:

### Ngoài sân trường (`!inClassroom && !inLibraryLobby`)
1. **Xe máy cá nhân (`bikeState.pos`, bán kính `2.5m`):**
   - Nếu đang đứng gần xe: hiển thị gợi ý `"E — Lên xe máy"`.
   - Nếu đang ngồi trên xe (`bikeState.riding === true`): chỉ cho phép xuống xe khi xe đã giảm tốc (`|speed| < 1.0 m/s`).
2. **NPC Minh tại Cổng Parabol (`pos: (-72, 8)`, `triggerRadius: 2.5m`):**
   - Mở bước hội thoại nhiệm vụ chào tân sinh viên (`greet-minh`).
3. **Cửa Phòng học Tòa C1 (`CLASSROOM_DOOR.pos: (-58, -45.5)`, `triggerRadius: 2.5m`):**
   - Chuyển cảnh có hiệu ứng mờ dần (`fade`) vào không gian nội thất `Classroom`. Nếu người chơi đang đi xe máy tới cửa, hệ thống tự động chặn và nhắc xuống xe trước khi vào lớp.
4. **Cửa Sảnh chính Thư viện Tạ Quang Bửu (`LIBRARY_DOOR.pos: (38, 22.8)`, `triggerRadius: 3.6m`):**
   - Chuyển cảnh vào không gian nội thất `LibraryLobby` (Tượng GS. Tạ Quang Bửu, Quầy thông tin, Bảng từ vựng).

### Trong Phòng học C1 (`inClassroom === true`)
- Tương tác với **Cô giáo** `(2.2, -2.0)`, **Bảng đen** `(0, -2.6)`, **Vở ghi chép & Bài tập trên Bàn 1** `(-2.2, 0.6)` và **Cửa ra sân trường** `(0, 2.6)`.

### Trong Sảnh tầng 1 Thư viện (`inLibraryLobby === true`)
1. **Ngồi học / Đứng dậy tại 4 ghế bàn đọc (`seat:<seatId>` / `seat-stand-up`, bán kính `SEAT_INTERACT_RADIUS = 1.65m`):**
   - Khi đang đứng trong bán kính `1.65m` quanh một trong 4 ghế thuộc `STUDY_SEATS` (`tqb-1f-t1-s1`, `tqb-1f-t1-s2`, `tqb-1f-t2-s1`, `tqb-1f-t2-s2`), hệ thống hiển thị gợi ý **`"E — Ngồi học"`** và làm sáng đệm ghế + vòng chỉ báo sàn.
   - Người chơi có thể bấm phím `E`, nút **`✋ Tương tác`**, hoặc click/chạm trực tiếp vào ghế 3D để ngồi. Nếu click vào ghế từ khoảng cách `> 1.65m`, hệ thống từ chối dịch chuyển tức thời (`reason: 'too-far'`) và nhắc tiến lại gần ghế hơn.
   - Khi đang ngồi (`playerState.seated === true`), nhân vật chuyển sang tư thế ngồi học (`computeSeatedPoseTargets`, `SEATED_GROUP_Y_OFFSET = -0.35m`, tự ẩn balo để không xuyên tựa lưng), khóa di chuyển `WASD`/`Joystick`, giữ điều khiển xoay/zoom camera, gắn `studyRoomId: 'library-lobby'` và `seatId` vào `StudySessionState`, đồng thời hiển thị gợi ý **`"E — Đứng dậy"`** cùng nút **`🚶 Đứng dậy`** trên cả `CampusHud` và `StudyPanel`.
   - Khi đứng dậy, hàm `computeSafeStandUpPosition` đưa nhân vật về đúng vị trí đứng an toàn ngay sau lưng ghế (đã kiểm chứng `resolveLibraryLobbyCollisions(pos, 0.4).hit === null`). Khi rời sảnh Thư viện, dịch chuyển nhanh hoặc kết thúc phiên học, trạng thái ngồi tự động được giải phóng sạch sẽ.
2. **Vật thể truyền thống & học thuật trong sảnh:**
   - Tương tác với **Tượng GS. Tạ Quang Bửu** `(0, -2.1)` (`r <= 2.6m`), **Bảng từ vựng học thuật** `(3.6, -0.6)` (`r <= 2.4m`), **Quầy thủ thư** `(-3.6, -0.6)` (`r <= 2.4m`) và nút **Ra khỏi sảnh Thư viện**.

---

## 3. Hệ thống Dịch chuyển Nhanh (`Fast Travel`) & Xe máy

1. **Sáu Điểm Dịch chuyển Nhanh ([`FAST_TRAVEL_DESTINATIONS`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L1095-L1102)):**
   - Mở sẵn từ đầu gồm: `c1` `(-58, -43.5)`, `library` `(38, 12.5)`, `lake` `(24, 40)`, `parabol` `(-88, 10)`, `c9` `(-29, -2)` và `spawn` `(96, -6)`.
   - Mọi điểm đáp đều đã được xác minh nằm ngoài toàn bộ hộp va chạm (`resolveCollisions(pos, 0.4).hit === null`) và tự động xoay cả góc nhìn Camera (`yaw`) lẫn hướng mặt nhân vật (`facing`) thẳng vào công trình mục tiêu.
   - Biến cờ `fastTravelState.traveling` ngăn chặn hiện tượng bấm chồng nhiều lần trong lúc đang chuyển cảnh.
2. **Gọi Xe máy Cá nhân (`callBike`):**
   - Duy trì đúng **1 chiếc xe máy duy nhất** (`bikeState.instances === 1`). Khi bấm `"Gọi xe"`, hàm [`findFreeSpotNear`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L1042-L1052) tìm vị trí trống gần người chơi không vướng bất kỳ tòa nhà, thân cây hay hồ nước nào để đặt xe.

---

## 4. Hook Kiểm thử Tự động (`window.__bkhn`)

Để phục vụ kiểm thử tự động không phụ thuộc thao tác chuột phức tạp, [`Player.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Player.tsx) và [`app/page.tsx`](file:///home/bao/Hust3D/hust-hsk/app/page.tsx) đăng ký đối tượng `window.__bkhn` hỗ trợ các phương thức điều khiển chương trình:
- `getPos()`, `getYaw()`, `getPitch()`, `teleport(x, z, yaw?, pitch?)`
- `enterClassroom()`, `exitClassroom()`, `enterLibraryLobby()`, `exitLibraryLobby()`, `isInLibraryLobby()`
- `sitAtSeat(seatId)`, `standUp()`, `getSeatState()`, `getPose()`
- `getBike()`, `mountBike()`, `dismountBike()`, `callBike()`, `setBikePose(x, z, heading)`
- `fastTravel(destId)`, `getFastTravel()`
