# Kiến trúc Frontend & 3D WebGL (`Frontend Architecture`)

## 1. Cấu trúc Phân tầng trên Frontend

Frontend sử dụng **Next.js 14 App Router** ở chế độ xuất bản tĩnh (`output: 'export'` trong [`next.config.mjs`](file:///home/bao/Hust3D/hust-hsk/next.config.mjs)), chia thành 3 tầng hoạt động phối hợp:

1. **Tầng Điều phối & Giao diện DOM ([`app/page.tsx`](file:///home/bao/Hust3D/hust-hsk/app/page.tsx), `components/learn/*`, `components/ui/*`):**
   - Quản lý màn hình chào (Intro screen), chọn phòng Multiplayer, khung tạo nhân vật 3D ([`CharacterCreatorModal.tsx`](file:///home/bao/Hust3D/hust-hsk/components/ui/CharacterCreatorModal.tsx)), thanh HUD, Bản đồ thu nhỏ ([`Minimap.tsx`](file:///home/bao/Hust3D/hust-hsk/components/ui/Minimap.tsx)), cần điều khiển cảm ứng ([`Joystick.tsx`](file:///home/bao/Hust3D/hust-hsk/components/ui/Joystick.tsx)) và các bảng học HSK ([`QuestPanel.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/QuestPanel.tsx), [`Handbook.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/Handbook.tsx), [`ReviewSession.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/ReviewSession.tsx)).
   - Chỉ nạp động (`next/dynamic` với `ssr: false`) [`CampusScene.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/CampusScene.tsx) **sau khi** người dùng bấm nút `"Vào trường"`, giúp trang đầu tải tức thì và tuân thủ chính sách Autoplay âm thanh của trình duyệt.

2. **Tầng Cầu nối Trạng thái Khung hình ([`lib/playerState.ts`](file:///home/bao/Hust3D/hust-hsk/lib/playerState.ts)):**
   - Gồm các cấu trúc mutable `playerState`, `playerInput`, `bikeState`, `bikeInput`, `fastTravelState`.
   - Component 3D [`Player.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Player.tsx) đọc `playerInput` và ghi vị trí/góc quay mới vào `playerState` trong vòng lặp `useFrame` (60 FPS).
   - Giao diện React (`app/page.tsx`, `Minimap.tsx`) lấy mẫu (`setInterval` 120–200 ms) từ `playerState` để cập nhật tên khu vực (`zone`), gợi ý tương tác gần nhất và vị trí chấm tròn trên bản đồ mà không gây re-render React mỗi frame.

3. **Tầng Kết xuất 3D WebGL (`components/three/*`):**
   - [`CampusScene.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/CampusScene.tsx) khởi tạo `<Canvas>` cùng hệ thống ánh sáng theo 3 thời điểm (`day`, `sunset`, `night`) và bản đồ phản xạ môi trường vật lý (IBL) qua `ProceduralEnvironment` (`THREE.PMREMGenerator`).
   - Hỗ trợ 3 chế độ không gian loại trừ nhau:
     - **Khuôn viên ngoài trời (Mặc định):** Render [`Ground.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Ground.tsx), [`Landmarks.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Landmarks.tsx), [`CampusExpansion.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/CampusExpansion.tsx), [`BackgroundBuildings.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/BackgroundBuildings.tsx), [`AmbientLife.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/AmbientLife.tsx), [`Motorbike.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Motorbike.tsx) và [`RemotePlayers.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/RemotePlayers.tsx).
     - **Phòng học mô phỏng (`inClassroom = true`):** Render [`Classroom.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/Classroom.tsx).
     - **Sảnh tầng 1 Thư viện (`inLibraryLobby = true`):** Render [`LibraryLobby.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/LibraryLobby.tsx).

---

## 2. Quy chuẩn Vật liệu Procedural PBR & Quản lý Bộ nhớ WebGL

1. **Sinh Texture Tự động Có Hạt giống Cố định (`Deterministic Procedural Textures`):**
   - Các hàm tạo vật liệu trong [`components/three/materials.ts`](file:///home/bao/Hust3D/hust-hsk/components/three/materials.ts) và bảng chữ trong [`components/three/TextPlate.tsx`](file:///home/bao/Hust3D/hust-hsk/components/three/TextPlate.tsx) sử dụng bộ sinh số giả ngẫu nhiên có seed cố định (`mulberry32` / LCG) trên `HTMLCanvasElement`.
   - Mọi `THREE.CanvasTexture` dùng làm bản đồ màu (`map`) bắt buộc đặt `tex.colorSpace = THREE.SRGBColorSpace` và `tex.anisotropy = 4` (hoặc `8` cho mặt đường/biển chữ).
2. **Tối ưu Draw Calls:**
   - Các chi tiết kiến trúc tĩnh lặp lại cùng vật liệu (lam chắn nắng, bậc thang, gạch hoa gió C1, khung cửa sổ) được gộp thành một `THREE.BufferGeometry` duy nhất bằng hàm `mergeBoxes` hoặc render qua `<instancedMesh>` (như cánh đồng sen/súng trên Hồ Tiền và hàng cây nền).
3. **Giải phóng Tài nguyên GPU (`.dispose()`):**
   - Mọi `BufferGeometry`, `Material`, `CanvasTexture` hoặc `WebGLRenderTarget` khởi tạo động trong `useMemo` / `useEffect` phải được gọi `.dispose()` trong hàm cleanup của `useEffect` để tránh rò rỉ bộ nhớ GPU khi người chơi chuyển đổi giữa sân trường, phòng học và sảnh thư viện.
