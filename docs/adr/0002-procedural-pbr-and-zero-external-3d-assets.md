# ADR-0002: Vật liệu Procedural PBR & Không Phụ thuộc Tài nguyên 3D Ngoài

- **Trạng thái:** Đã chấp thuận & Đang áp dụng
- **Bối cảnh:**
  - Một khuôn viên trường đại học 3D rộng `264m × 184m` với hơn 40 tòa nhà, hồ nước, hàng trăm cây xanh và 10 mẫu đồng phục sinh viên nếu sử dụng các file mô hình `.glb`/`.gltf` và ảnh texture 2K/4K bên ngoài sẽ khiến dung lượng tải ban đầu vượt quá 30–50 MB, gây chậm trên mạng di động và dễ phát sinh lỗi đường dẫn/CORS khi xuất bản tĩnh (`next build` → `out/`).
  - Tuy nhiên, nếu chỉ tô màu phẳng (`MeshStandardMaterial` đơn sắc) thì cảnh quan sẽ trông như mô hình đồ chơi nhựa và không thể hiện được chất cảm bê tông, đá hoa cương, gạch đất nung hay vải đồng phục Bách khoa.
- **Quyết định:**
  1. Dựng toàn bộ hình học công trình và nhân vật bằng các khối hình học thủ tục có kiểm soát (`BoxGeometry`, `CylinderGeometry`, `ExtrudeGeometry`, `mergeBoxes`, `InstancedMesh`) đối chiếu trực tiếp với bộ ảnh thật tại `tham-khao/`.
  2. Sinh toàn bộ texture bề mặt (`map`, `bumpMap`, `roughnessMap`), bản đồ môi trường phản xạ (`PMREMGenerator` equirectangular sky) và biển hiệu chữ tiếng Việt/tiếng Trung ([`TextPlate.tsx`](../../components/three/TextPlate.tsx)) ngay trên trình duyệt bằng `HTMLCanvasElement` + bộ sinh số giả ngẫu nhiên có hạt giống cố định (`mulberry32` trong [`components/three/materials.ts`](../../components/three/materials.ts)).
  3. Bắt buộc giải phóng (`.dispose()`) mọi geometry, material và texture khởi tạo động khi component unmount.
- **Hệ quả:**
  - Tổng dung lượng gói xuất bản tĩnh (`out/`) cực nhẹ (`~1.7 MB`), tải tức thì không cần màn hình chờ tải asset dài, hoạt động 100% offline sau khi mở trang mà vẫn đạt độ chân thực cao về ánh sáng PBR và chất liệu kiến trúc.
