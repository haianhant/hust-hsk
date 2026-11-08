---
name: hust-3d-graphics-enhancer
description: >-
  Use this skill when enhancing 3D graphics quality, procedural PBR materials,
  canvas textures, architectural detailing, foliage realism, water effects,
  or lighting and atmosphere in the Bách khoa Hán ngữ 3D (hust-hsk) project.
---

# HUST 3D Graphics Enhancer Skill

Hướng dẫn chuẩn hóa quy trình nâng cấp chất lượng đồ họa 3D cho dự án **Bách khoa Hán ngữ 3D (`hust-hsk`)** bằng Three.js và `@react-three/fiber`, kết hợp giữa **Procedural PBR (`CanvasTexture`)** và **bộ tư liệu ảnh thực tế `tham-khao/`**.

## Quy trình nâng cấp đồ họa 4 bước

### Bước 1: Vật liệu Procedural PBR `CanvasTexture` & Đối chiếu Ảnh thật `tham-khao/`
Khi làm việc với mặt đường, sân quảng trường, tường bê tông, gạch đất nung, bờ đá hoặc các chi tiết biểu trưng:
1. Mở xem các ảnh chụp thực tế tương ứng trong thư mục `tham-khao/` (`thu-vien/`, `c1/`, `c7/`, `c9/`, `ho-tien/`, `cong-parabol/`, `b1-soict/`, `ktx/`, `dong-phuc/`) để lấy đúng sắc độ, tỉ lệ gờ phào và chất liệu bề mặt.
2. Tạo hàm sinh `THREE.CanvasTexture` với bộ sinh số giả ngẫu nhiên có seed cố định (`mulberry32` hoặc LCG) cho các bề mặt lặp lại; đồng thời cho phép dùng texture/ảnh nén nhẹ cho các phù điêu, huy hiệu, logo hoặc tranh trưng bày cần độ chân thực cao.
3. Gán đồng thời `map` (màu sắc + độ lệch sắc độ hạt), `bumpMap` (độ nhám nổi vi mô với `bumpScale: 0.005–0.025`), và điều chỉnh `roughness` / `metalness` phù hợp với chất liệu thật tại ĐHBK Hà Nội.
4. Xem mẫu code chi tiết cho từng vật liệu (bê tông cổng Parabol, gạch đỏ sân Thư viện, đá lát sân C1, nhựa đường, mặt nước Hồ Tiền) tại:
   - [procedural-pbr-recipes.md](./references/procedural-pbr-recipes.md)

### Bước 2: Tăng chiều sâu kiến trúc (Architectural Micro-Detailing)
Một công trình nhìn "như thật" nhờ các lớp chuyển tiếp ánh sáng và bóng đổ:
1. **Chân đế (Plinth/Baseboard):** Mọi tòa nhà (C1, C2, C9, D3–D9, Thư viện) phải có gờ chân tường cao `0.3–0.6m` sẫm màu hơn tường chính một nấc (`#D8D5CE` hoặc `#B9B9B0`) để neo công trình xuống mặt đất.
2. **Độ lùi cửa sổ (Window Recess):** Không dán phẳng mặt kính lên tường. Luôn dựng theo 3 lớp:
   - Khung bao ngoài (`frame`) nhô `0.06m`.
   - Đố chia ô (`mullion`) ở `0.05m`.
   - Mặt kính (`glass`) lùi sâu `0.03–0.04m` kèm hốc tối hoặc mảng rèm mờ bên trong.
3. **Bóng âm trần (Soffit Shadow Strip):** Dưới mỗi mái hiên, dầm hành lang (loggia C1, sảnh Thư viện, chiếu nghỉ C9), đặt một lớp hộp mỏng màu tối (`#2E3438`) ở mặt dưới trần để tạo độ tương phản chiều sâu tự nhiên kể cả ở mặt khuất nắng.
4. **Mái & Gờ nước (Parapet & Fascia):** Mép mái luôn có gờ chắn nước (parapet) hoặc viền diềm mái (`fascia`) khác sắc độ với mặt tường.

### Bước 3: Cải thiện Cảnh quan, Mặt nước & Bầu trời
1. **Mặt nước Hồ Tiền (`TienLake.tsx`):**
   - Kết hợp `bumpMap` sóng gợn sinh từ hàm sin/noise hai chiều và giảm `roughness` xuống `0.18–0.25` để bắt sáng bầu trời dịu mà không gây bóng đen sắc cạnh.
2. **Cây xanh đa sắc độ (`Trees.tsx`, `C1Building.tsx`, `LibraryBuilding.tsx`):**
   - Mỗi tán cây chia thành các cụm lá có sắc độ phân tầng: cụm đỉnh nhận nắng sáng hơn (`+10%` độ sáng, hơi ngả vàng ấm), cụm đáy/lõi khuất sáng đậm hơn (`-12%` độ sáng).
   - Các cành gỗ (`CylinderGeometry` thuôn) phải nối từ chạc thân cây hướng đúng vào tâm từng cụm lá (không để cụm lá lơ lửng).
3. **Ánh sáng & Khí quyển (`CampusScene.tsx`):**
   - Duy trì hệ đèn đa hướng cân bằng:
     - `hemisphereLight` (trời xanh dịu `#dceefb` / phản xạ đất cỏ `#8a9a72`).
     - `directionalLight` mặt trời chính có đổ bóng (`shadow-mapSize: 2048`, `shadow-bias: -0.0003`, `shadow-normalBias: 0.03`).
     - Các đèn `directionalLight` phụ (fill Tây, fill Nam ấm `#fff2df`, fill Bắc) không đổ bóng để giữ chi tiết ở các mặt đứng khuất nắng.

### Bước 4: Kiểm tra Hiệu năng & Dọn dẹp Bộ nhớ
1. Gộp các chi tiết tĩnh cùng vật liệu bằng helper `mergeBoxes()` hoặc `InstancedMesh` để giữ tổng số draw calls thấp.
2. Đảm bảo mọi tài nguyên `geometry` và `texture` tạo trong `useMemo` đều có `useEffect(() => () => { ...dispose(); }, [...])`.
3. Chạy kiểm thử thông qua skill `web-3d-visual-audit`.
