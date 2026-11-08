# Đặc tả Module: Thư viện Tạ Quang Bửu & Sảnh Tầng 1

## 1. Module `building.library` & `landmark.hust-sign` — Thư viện Tạ Quang Bửu

- **Module IDs:** `building.library`, `landmark.hust-sign`
- **Purpose:** Tái hiện công trình biểu tượng lớn nhất của Đại học Bách khoa Hà Nội — Thư viện Điện tử Tạ Quang Bửu 10 tầng cùng quảng trường tiền cảnh phía Bắc và cụm chữ `HUST` 3D đỏ.
- **Source Paths:**
  - Hình học & Vật liệu 3D: [`components/three/LibraryBuilding.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/LibraryBuilding.tsx), `HustSign` trong [`components/three/Landmarks.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Landmarks.tsx)
  - Tọa độ & Hộp va chạm: [`LIBRARY`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L76-L91), [`HUST_SIGN`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L94-L97), và `BUILDING_COLLIDERS` trong [`lib/campus.ts`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L599-L601)
- **Reference Assets:**
  - 5 ảnh chụp thực tế tại [`tham-khao/thu-vien/`](file:///home/bao/Hust3D/hust-hsk/tham-khao/thu-vien/README.md) (`thu-vien-cao-nhin-cheo-01.jpg`, `thu-vien-mat-tien-01.jpg`, `thu-vien-mat-tien-san-truoc-01.jpg`, `thu-vien-nhin-xa-01.jpg`, `thu-vien-mat-tien-chu-hust-01.jpg`).
- **Current Implementation Status:** **Production** (Đã mở rộng đúng tỉ lệ 3 nhịp ở Đợt 7).
- **Invariants (Ràng buộc Bất biến):**
  1. **Hướng Mặt tiền Chính (`-Z` / Phía Bắc Scene):**
     - Mặt tiền có đồng hồ tròn, 2 cụm lam ngang, biển chữ vàng `"THƯ VIỆN TẠ QUANG BỬU"`, sảnh 6 cột và tiền cảnh chữ `HUST` **bắt buộc hướng về phía Bắc (`-Z`)**, tuyệt đối không quay mặt đồng hồ ra phía Tây (Hồ Tiền) hay phía Nam.
  2. **Hình khối Tháp 10 Tầng & Khối Đế:**
     - Khối tháp 10 tầng (`floors = 10`, `floorHeight = 3.2m`) tại tâm `(38, 36.5)` chia 3 nhịp đứng (`x: 25.5..50.5m`, rộng `25m`, sâu `13m`), trong đó nhịp giữa nhô về phía Bắc và cao hơn hai cánh bên nửa tầng; bên phải có dải kính lõi thang đứng.
     - Khối đế ôm phía Bắc tháp (`x: 31.0..45.0m`, `z: 23.5..30.5m`) có 2 cụm lam ngang màu xám kẹp hai bên **đồng hồ tròn đặt thấp** (`clock: { x: 38, y: 7.3, z: 23.9, radius: 1.3 }`) ngay trên mái hiên sảnh (`y = 6.0m`).
     - Sảnh chính có 6 cột tròn lớn màu xám bạc, hệ khung cửa kính màu xanh dương đậm `#1E5AA8` và bậc thềm đi lên từ phía Bắc (`z: 17..24.5m` nằm ngoài collider khối đế để người chơi đi tới sát cửa tại `z ≈ 22.8m`).
  3. **Tiền cảnh & Cụm chữ `HUST` (`landmark.hust-sign`):**
     - Cụm chữ `HUST` 3D màu đỏ đứng trên bệ đen tại `(38, 14)` (`plinth: { minX: 35.2, maxX: 40.8, minZ: 13.4, maxZ: 14.6 }`) kèm dòng chữ `"ONE LOVE. ONE FUTURE."` đọc xuôi khi nhìn từ phía Bắc vào sảnh.
     - Hai bên sân trồng hàng cau vua (`LibPalm`) có thân đốt vòng, bẹ cau xanh (`crownshaft`) và 10 tàu lá cong rủ đa sắc độ.
- **Acceptance Criteria:**
  - Bài kiểm thử `node test/walk-to-library-door.cjs` và `node test/leg-sim.cjs` (`leg3`, `leg4`) chạy PASS.
  - Khi dịch chuyển nhanh tới `library` `(38, 12.5)`, camera nhìn thẳng vào chữ `HUST`, mặt đồng hồ và cửa sảnh chính.
- **Known Limitations:**
  - Chưa có tư liệu ảnh chụp chi tiết mặt Nam và mặt Đông của tòa Thư viện nên hai mặt này dùng hệ lưới cửa sổ đồng nhất với hai cánh bên.

---

## 2. Module `interior.library-lobby` — Sảnh Tầng 1 Thư viện Tạ Quang Bửu

- **Module ID:** `interior.library-lobby`
- **Purpose:** Không gian nội thất Sảnh tầng 1 Thư viện phục vụ tham quan truyền thống và tra cứu từ vựng học thuật.
- **Source Paths:**
  - Hình học 3D: [`components/three/LibraryLobby.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/LibraryLobby.tsx)
  - Tọa độ & Va chạm cục bộ: [`LIBRARY_DOOR`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L915-L919), [`LIBRARY_LOBBY`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L921-L927), [`resolveLibraryLobbyCollisions`](file:///home/bao/Hust3D/hust-hsk/lib/campus.ts#L939-L972)
- **Reference Assets:** Tư liệu ảnh thật Sảnh tầng 1 Thư viện Tạ Quang Bửu ([`docs/reference-visual.md`](file:///home/bao/Hust3D/hust-hsk/docs/reference-visual.md) §3).
- **Current Implementation Status:** **Production**.
- **Invariants:**
  - Điểm kích hoạt cửa vào `LIBRARY_DOOR` đặt tại `(38, 22.8)` với `triggerRadius = 3.6m` (bao phủ vùng đứng ngay ngoài collider khối đế `z = 23.1m`).
  - Không gian cục bộ `bounds: { minX: -5.4, maxX: 5.4, minZ: -3.8, maxZ: 3.8 }` gồm:
    - Tượng bán thân đồng **GS. Tạ Quang Bửu (1910–1986)** trên bệ gỗ tại `(0, -2.1)` kèm 4 trụ inox dây nhung đỏ.
    - Bức tường hậu cảnh gỗ nâu khắc các dải số nhị phân `0 / 1` phát sáng màu vàng hổ phách ấm.
    - Sàn đá hoa văn rẻ quạt và thông tầng lửng.
- **Acceptance Criteria:**
  - Người chơi đứng trước cửa Thư viện nhấn `E` vào được Sảnh tầng 1, tương tác được với Tượng GS. Tạ Quang Bửu, Quầy thông tin, Bảng từ vựng và đi ra lại sân trước Thư viện.
- **Known Limitations:**
  - Hiện chỉ dựng không gian Sảnh tầng 1 và tầng lửng nhìn lên, chưa mở lối đi lên các phòng đọc tầng 2–10.
