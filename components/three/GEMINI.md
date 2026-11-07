# 3D Scene & Graphics Rules (`components/three/`)

Các quy tắc bắt buộc khi chỉnh sửa hoặc thêm mới component 3D trong `components/three/`:

## 1. Vật liệu & Ánh sáng Chân thực (Realistic PBR & Procedural Texturing)
- **Không dùng màu phẳng đơn điệu cho bề mặt lớn:** Mặt đường nhựa, vỉa hè, sân gạch đất nung, sân đá C1, bờ kè đá hộc, và tường bê tông lớn nên kết hợp `THREE.CanvasTexture` sinh tự động (procedural noise, vân gạch, vết ố thời gian, mạch lát) gán vào `map`, `bumpMap` (`bumpScale: 0.005–0.03`), hoặc `roughnessMap`.
- **Cấu hình `colorSpace` & lọc nét:** Mọi `CanvasTexture` dùng làm `map` màu phải gán `tex.colorSpace = THREE.SRGBColorSpace` và `tex.anisotropy = 4` (hoặc `8` cho biển chữ/mặt đường nhìn nghiêng).
- **Kính kiến trúc (Architectural Glass):** Không để kính đen kịt hoặc phẳng lì. Kết hợp `roughness: 0.2–0.35`, `metalness: 0.1–0.3`, `emissive` nhẹ theo tông xanh-xám, và luôn có khung cửa (`frame`) + đố cửa (`mullion`) + mảng tối/rèm lùi phía sau.
- **Tách lớp chiều sâu kiến trúc (Depth Layering):**
  - Hành lang, mái hiên, và ban công phải có mảng tối dưới trần (`soffit` / shadow strip) để tách biệt rõ ràng giữa cột, dầm và tường lõi khi nhìn từ tầm mắt người chơi (`y = 1.7m`).
  - Chân công trình, chân cột, bệ tượng và chân tường phải có gờ chân đế (`plinth` / `baseboard`) hoặc bóng tiếp xúc mặt đất (contact shadow) để công trình không có cảm giác lơ lửng.

## 2. Cây xanh & Cảnh quan (Foliage & Landscaping)
- **Tán cây tự nhiên:** Không dựng tán cây bằng 1 hình cầu đơn lẻ hay xếp chồng đồng trục (trông giả như kẹo mút/nấm). Tán cây phải gồm 5–7 cụm lệch tâm, tỉ lệ nén `scale={[1, 0.6..0.75, 1]}` khác nhau, phối 2–3 sắc độ lá (vùng nhận nắng sáng hơn, vùng khuất tối hơn) và có cành nhánh nối từ thân chính vào tâm cụm lá.
- **Va chạm cây xanh:** Người đi bộ không bị chặn bởi tán cây; riêng thân cây chính cần khai báo vào `TREE_TRUNKS` trong `lib/campus.ts` nếu nằm gần đường để xe máy (`resolveBikeCollisions`) không đi xuyên qua thân.

## 3. Tương thích Gameplay & Camera
- Không đặt vật cản mới chắn các tuyến trong `LEGS`, các điểm `FAST_TRAVEL_DESTINATIONS`, điểm đỗ xe `BIKE_PARK`, hay bán kính tương tác cửa lớp `CLASSROOM_DOOR` (`triggerRadius: 2.5m`).
- Mọi bảng tên dùng `Billboard` hoặc `LabelPlane` phải đặt ngoài group có `scale` âm hoặc phép xoay làm lật chữ ngược; chữ phải đọc xuôi từ hướng tiếp cận của người chơi.
