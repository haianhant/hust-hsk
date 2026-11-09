# Đặc tả Module: Thư viện Tạ Quang Bửu (Ngoại thất & Nội thất Đa tầng Tầng 1–10)

## 1. Module `building.library` & `landmark.hust-sign` — Thư viện Tạ Quang Bửu

- **Module IDs:** `building.library`, `landmark.hust-sign`
- **Purpose:** Tái hiện công trình biểu tượng lớn nhất của Đại học Bách khoa Hà Nội — Thư viện Điện tử Tạ Quang Bửu 10 tầng cùng quảng trường tiền cảnh phía Bắc và cụm chữ `HUST` 3D đỏ.
- **Source Paths:**
  - Hình học & Vật liệu 3D: [`components/three/LibraryBuilding.tsx`](../../../components/three/LibraryBuilding.tsx), `HustSign` trong [`components/three/Landmarks.tsx`](../../../components/three/Landmarks.tsx)
  - Tọa độ & Hộp va chạm: [`LIBRARY`](../../../lib/campus.ts#L76-L91), [`HUST_SIGN`](../../../lib/campus.ts#L94-L97), và `BUILDING_COLLIDERS` trong [`lib/campus.ts`](../../../lib/campus.ts#L599-L601)
- **Reference Assets:**
  - 5 ảnh chụp thực tế tại [`tham-khao/thu-vien/`](../../../tham-khao/thu-vien/README.md) (`thu-vien-cao-nhin-cheo-01.jpg`, `thu-vien-mat-tien-01.jpg`, `thu-vien-mat-tien-san-truoc-01.jpg`, `thu-vien-nhin-xa-01.jpg`, `thu-vien-mat-tien-chu-hust-01.jpg`) và mô hình kiến trúc tham chiếu từ `studywithhuster.cyou`.
- **Current Implementation Status:** **Production** (Đã nâng cấp đồng hồ thời gian thực Hà Nội `UTC+7` 3 kim Giờ–Phút–Giây, cửa kính trượt tự động khi tiến lại gần sảnh, ánh sáng ấm nội thất và ghế đá đối xứng sân trước).
- **Invariants (Ràng buộc Bất biến):**
  1. **Hướng Mặt tiền Chính (`-Z` / Phía Bắc Scene):**
     - Mặt tiền có đồng hồ tròn thời gian thực Hà Nội (`UTC+7`), 2 cụm lam ngang, biển chữ vàng `"THƯ VIỆN TẠ QUANG BỬU"`, sảnh 6 cột và tiền cảnh chữ `HUST` **bắt buộc hướng về phía Bắc (`-Z`)**, tuyệt đối không quay mặt đồng hồ ra phía Tây (Hồ Tiền) hay phía Nam.
  2. **Hình khối Tháp 10 Tầng & Khối Đế:**
     - Khối tháp 10 tầng (`floors = 10`, `floorHeight = 3.2m`) tại tâm `(38, 36.5)` chia 3 nhịp đứng (`x: 25.5..50.5m`, rộng `25m`, sâu `13m`), trong đó nhịp giữa nhô về phía Bắc và cao hơn hai cánh bên nửa tầng; bên phải có dải kính lõi thang đứng.
     - Khối đế ôm phía Bắc tháp (`x: 31.0..45.0m`, `z: 23.5..30.5m`) có 2 cụm lam ngang màu xám kẹp hai bên **đồng hồ tròn đặt thấp** (`clock: { x: 38, y: 7.3, z: 23.9, radius: 1.3 }`) ngay trên mái hiên sảnh (`y = 6.0m`), chạy kim Giờ, Phút và kim Giây đỏ theo múi giờ `Asia/Ho_Chi_Minh`.
     - Sảnh chính có 6 cột tròn lớn màu xám bạc, hệ cửa kính trượt tự động tại `z = 26.5` mở êm sang hai bên khi người chơi tiến vào vùng hiên sảnh (`x ∈ [33.5, 42.5], z ∈ [18.5, 27.2]`), kèm bậc thềm đi lên từ phía Bắc (`z: 17..24.5m` nằm ngoài collider khối đế để người chơi đi tới sát cửa tại `z ≈ 22.8m`).
  3. **Tiền cảnh & Cụm chữ `HUST` (`landmark.hust-sign`):**
     - Cụm chữ `HUST` 3D màu đỏ đứng trên bệ đen tại `(38, 14)` (`plinth: { minX: 35.2, maxX: 40.8, minZ: 13.4, maxZ: 14.6 }`) kèm dòng chữ `"ONE LOVE. ONE FUTURE."` đọc xuôi khi nhìn từ phía Bắc vào sảnh.
     - Hai bên sân trồng hàng cau vua (`LibPalm`) có thân đốt vòng, bẹ cau xanh (`crownshaft`), 10 tàu lá cong rủ đa sắc độ và ghế đá sân trước.
- **Acceptance Criteria:**
  - Bài kiểm thử `node test/walk-to-library-door.cjs` và `node test/leg-sim.cjs` (`leg3`, `leg4`) chạy PASS.
  - Khi dịch chuyển nhanh tới `library` `(38, 12.5)`, camera nhìn thẳng vào chữ `HUST`, mặt đồng hồ và cửa sảnh chính.

---

## 2. Module `interior.library-lobby` — Nội thất Đa tầng Thư viện Tạ Quang Bửu (`Tầng 1–10`) & Khu Bàn đọc Tự học (`PR8/PR9`)

- **Module ID:** `interior.library-lobby`
- **Purpose:** Không gian nội thất đa tầng Thư viện Tạ Quang Bửu (`Tầng 1–10` theo chuẩn kiến trúc `studywithhuster.cyou`), kết hợp tham quan truyền thống, tra cứu từ vựng học thuật, **ngồi tự học tương tác 3D đa người chơi tại bàn đọc (`PR8/PR9`)**, trải nghiệm đàn **Grand Piano 88 phím** tại Tầng 6 và **Đài ngắm sao Kính thiên văn** trên Sân thượng Tầng 10.
- **Source Paths:**
  - Tổ hợp Nội thất Đa tầng 3D: [`components/three/LibraryLobby.tsx`](../../../components/three/LibraryLobby.tsx)
  - Các bộ dựng kiến trúc thủ tục đa tầng (100% Procedural PBR + `InstancedMesh` batching):
    - [`features/campus/buildings/library/buildFloors1To5.ts`](../../../features/campus/buildings/library/buildFloors1To5.ts) — Khối A (`Tầng 1–5`: Đại sảnh Thông tầng Hình bầu dục 5 tầng `39m × 26m × 22.5m`, sàn ngôi sao 16 cánh, trần bức tranh mặt trời, cầu thang cong đôi, 3 thang máy, Phòng Mượn Sách phía Tây, ban công tự học Tầng 2–3, hành lang & 11 phòng đọc Tầng 4–5)
    - [`features/campus/buildings/library/buildRoom401.ts`](../../../features/campus/buildings/library/buildRoom401.ts) — Nội thất chi tiết Phòng đọc 401 & Phòng học nhóm 501 (12 bàn × 12 ghế = 144 chỗ, quầy máy tính chữ L 17 PC, 6 dãy kệ sách 2 mặt, quầy thủ thư, cổng xoay 3 chấu, 24 quạt trần quay)
    - [`features/campus/buildings/library/buildFloors6To7.ts`](../../../features/campus/buildings/library/buildFloors6To7.ts) — Khối B (`Tầng 6–7`: Không gian Sáng tạo, dải chữ phát sáng `INNOVATE · CONNECT · COLLABORATE · CREATE`, cột phễu loe `LatheGeometry`, đảo gỗ 3 ô dù, ghế bành vàng mù tạt, đàn **Grand Piano 88 phím** tương tác phát âm thanh WebAudio)
    - [`features/campus/buildings/library/buildFloor10Rooftop.ts`](../../../features/campus/buildings/library/buildFloor10Rooftop.ts) — Khối D (`Sân thượng Tầng 10`: Sàn lát đá, lối đi gỗ LED, giàn hoa Pergola chăng đèn dây, Đài ngắm sao tròn kèm Bản đồ sao bầu trời Hà Nội và **Kính thiên văn** tương tác)
    - [`features/campus/buildings/library/procedural-helpers.ts`](../../../features/campus/buildings/library/procedural-helpers.ts) — Hàm sinh PRNG `mulberry32`, `canvasTex` và giải phóng bộ nhớ WebGL `disposeObject3D`
  - Thanh điều hướng Thang máy & Chọn nhanh Tầng/Phòng (`T1–T10`): [`components/ui/LibraryFloorNav.tsx`](../../../components/ui/LibraryFloorNav.tsx)
  - Nội thất Bàn đọc & Ghế ngồi học 3D (`PR8/PR9`):
    - [`features/campus/buildings/library/LibraryStudyArea.tsx`](../../../features/campus/buildings/library/LibraryStudyArea.tsx)
    - [`features/campus/buildings/library/StudyTable.tsx`](../../../features/campus/buildings/library/StudyTable.tsx)
    - [`features/campus/buildings/library/StudyChair.tsx`](../../../features/campus/buildings/library/StudyChair.tsx)
    - [`features/campus/buildings/library/StudySeatMarkers.tsx`](../../../features/campus/buildings/library/StudySeatMarkers.tsx)
  - Danh mục ghế chuẩn (`STUDY_SEATS`): [`shared/contracts/study.ts`](../../../shared/contracts/study.ts)
  - Tọa độ, Cao độ đa tầng & Va chạm theo tầng: [`LIBRARY_DOOR`](../../../features/campus/world-data/buildings.ts), [`LIBRARY_LOBBY`](../../../features/campus/world-data/buildings.ts), [`LIBRARY_LOBBY_COLLIDERS`](../../../features/campus/world-data/colliders.ts), [`resolveLibraryLobbyCollisions`](../../../features/campus/world-data/spatial-utils.ts), [`computeLibraryElevation`](../../../lib/playerState.ts)
- **Current Implementation Status:** **Production** (Hoàn thiện toàn bộ Ngoại thất + Nội thất đa tầng Tầng 1–10 kết hợp bàn đọc tự học đa người chơi `PR8/PR9`).
- **Invariants:**
  - Điểm kích hoạt cửa vào `LIBRARY_DOOR` đặt tại `(38, 22.8)` với `triggerRadius = 3.6m`.
  - Không gian cục bộ mở rộng `bounds: { minX: -35.2, maxX: 35.2, minZ: -38.0, maxZ: 27.2 }` bảo toàn trọn vẹn các điểm neo tương tác tại trung tâm Đại sảnh Tầng 1:
    - Tượng bán thân đồng **GS. Tạ Quang Bửu (1910–1986)** trên bệ gỗ tại `(0, -2.1)` kèm 4 trụ inox dây nhung đỏ.
    - Bức tường hậu cảnh gỗ nâu khắc các dải số nhị phân `0 / 1` phát sáng màu vàng hổ phách ấm.
    - Quầy thông tin `(-3.6, -0.6)` và Bảng từ vựng Hán ngữ `(3.6, -0.6)`.
    - **2 Bàn đọc gỗ sồi hiện đại (`1.36m × 0.76m × 0.75m`) & 4 Ghế ngồi học (`STUDY_SEATS`):**
      - `tqb-1f-t1` (**Bàn đọc Tây 1**) tại `(-2.15, 1.75)` với 2 ghế `tqb-1f-t1-s1` `(-2.4, 1.2)` và `tqb-1f-t1-s2` `(-1.9, 2.3)`.
      - `tqb-1f-t2` (**Bàn đọc Đông 2**) tại `(2.15, 1.75)` với 2 ghế `tqb-1f-t2-s1` `(1.9, 1.2)` và `tqb-1f-t2-s2` `(2.4, 2.3)`.
      - Giữ nguyên lối đi chính giữa rộng `2.94m` (`x ∈ [-1.47, 1.47]`) từ cửa vào `spawn (0, 2.4)` nhìn thẳng tới Tượng GS. Tạ Quang Bửu `(0, -2.1)`.
- **Acceptance Criteria:**
  - Các bài kiểm thử `node test/library-seating-smoke.cjs` (`13/13 PASS`) và `node test/pr9-multiplayer-study-smoke.cjs` (`12/12 PASS`) chạy thành công.
  - Người chơi có thể đi bộ giữa Đại sảnh Tầng 1, Phòng Mượn Sách, đi lên cầu thang cong lên Tầng 2, hoặc dùng thanh điều hướng Thang máy (`T1` → `T2` → `T3` → `P.401` → `P.411` → `P.419` → `P.501` → `T6` → `T7` → `T10`) để khám phá toàn bộ 10 tầng Thư viện Tạ Quang Bửu.

