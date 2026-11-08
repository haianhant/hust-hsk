# Thư mục Tư liệu Tham khảo Thực tế (`tham-khao/`) — Bách khoa Hán ngữ 3D

Thư mục này lưu trữ bộ ảnh chụp thực tế về khuôn viên **Đại học Bách khoa Hà Nội (HUST)** và **Đồng phục sinh viên Bách khoa**, đóng vai trò là tư liệu đối chiếu chuẩn (**Visual Ground Truth**) khi dựng hình khối, tỉ lệ mặt đứng và vật liệu 3D.

---

## 1. Danh mục Phân khu & Ánh xạ Module ID

| Thư mục | Module ID Liên kết | Nội dung Tư liệu | Ảnh `.jpg` trên đĩa | Đặc tả Kiến trúc |
|---|---|---|---:|---|
| [`thu-vien/`](./thu-vien/README.md) | `building.library`, `landmark.hust-sign` | Mặt ngoài Thư viện Tạ Quang Bửu (chính diện, chéo cao, sân trước, chữ `HUST`, nhìn xa) | 5 | [docs/world/buildings/library.md](../docs/world/buildings/library.md) |
| [`c1/`](./c1/README.md) | `building.c1`, `landmark.i-love-bk` | Tòa C1 (mặt tiền 9 sóng mái, lưới gạch hoa gió cận cảnh, sân trước, chữ `I ❤ BK`) | 6 | [docs/world/buildings/c1.md](../docs/world/buildings/c1.md) |
| [`c7/`](./c7/README.md) | `building.c7` | Tổ hợp Tòa C7 9 tầng (2 ảnh flycam khối chữ E, sân trong, phối cảnh mặt ngoài) | 4 | [docs/world/buildings/c7.md](../docs/world/buildings/c7.md) |
| [`c9/`](./c9/README.md) | `building.c9` | Tòa C9 & cầu thang bộ ngoài trời lan can đỏ 4 vế zic-zac | 1 | [docs/world/buildings/c9-parabol-lake.md](../docs/world/buildings/c9-parabol-lake.md) |
| [`ho-tien/`](./ho-tien/README.md) | `landscape.tien-lake` | Hồ Tiền (bờ kè lát gạch, đèn cầu, liễu rủ, mặt hồ phủ sen/súng, dãy nhà D) | 2 | [docs/world/buildings/c9-parabol-lake.md](../docs/world/buildings/c9-parabol-lake.md) |
| [`cong-parabol/`](./cong-parabol/README.md) | `building.parabol-gate` | Cổng Parabol đường Giải Phóng (chính diện, từ trong trường, cận bụng vòm, hoàng hôn) | 4 | [docs/world/buildings/c9-parabol-lake.md](../docs/world/buildings/c9-parabol-lake.md) |
| [`b1-soict/`](./b1-soict/README.md) | `building.b1-soict` | Tòa B1 Trường CNTT & Truyền thông — SoICT (mặt chính góc cong, tầng trệt đỏ nâu, biển `B1`) | 3 | [docs/world/buildings/east-campus.md](../docs/world/buildings/east-campus.md) |
| [`ktx/`](./ktx/README.md) | `building.dorm-complex` | Khu Ký túc xá B3–B13 (toàn cảnh, nhà B9 vàng cổng Hội SV, tòa KTX mới xanh–trắng) | 3 | [docs/world/buildings/east-campus.md](../docs/world/buildings/east-campus.md) |
| [`dong-phuc/`](./dong-phuc/README.md) | `avatar.outfit.*`, `avatar.accessory.skirt` | Đồng phục HUST: 3 ảnh chụp chi tiết trên đĩa + 7 mẫu đặc tả kèm URL nguồn trong `dong-phuc/README.md` | 3 (+7 mẫu đặc tả) | [docs/world/avatar/outfits.md](../docs/world/avatar/outfits.md) |

- **Tổng số file ảnh `.jpg` hiện có trên đĩa:** **31 ảnh** (JPEG nén nhẹ, chiều rộng `≤ 1600px`, mỗi ảnh `≤ 600KB`), kết hợp **7 mục đặc tả mẫu đồng phục** trong `dong-phuc/README.md` (tổng cộng **38 mục tư liệu tham chiếu**).

---

## 2. Quy tắc Tổ chức & Mở rộng Thư mục (`Folder Taxonomy Rules`)

1. **Giữ ổn định đường dẫn hiện có:**
   - Tuyệt đối không tự ý đổi tên hoặc di chuyển hàng loạt các file `.jpg` hiện có vì đường dẫn đang được tham chiếu trực tiếp trong comment source code (`lib/campus.ts`, `components/three/*`) và tài liệu đặc tả `docs/world/*`.
2. **Khi nào chia thư mục con theo tầng / bộ phận:**
   - Với các công trình hiện có `1–6` ảnh mặt ngoài, giữ phẳng ngay trong `tham-khao/<ten-cong-trinh>/` kèm `README.md`.
   - Khi một công trình được bổ sung nhiều hơn **10 ảnh** hoặc mở rộng nội thất nhiều tầng (ví dụ: các tầng đọc của Thư viện Tạ Quang Bửu hoặc các phòng học/hành lang Tòa C1, C7), chia thành các thư mục con chuẩn:
     - `ngoai-that/` (mặt đứng, flycam, cảnh quan tiếp cận)
     - `sanh-tang-1/` (sảnh chính, quầy thông tin)
     - `phong-hoc/` hoặc `phong-doc/` (nội thất bàn ghế, bảng, hành lang)

---

## 3. Lưu ý Quan trọng Khi Đối chiếu Ảnh

- Ảnh thuộc bản quyền của bên thứ ba, chỉ sử dụng làm tư liệu tham khảo hình học/vật liệu khi lập trình mô hình 3D; luôn giữ nguyên nguồn dẫn trong `README.md` của từng thư mục.
- **`c7/c7-phoi-canh-mat-ngoai.jpg`** là ảnh phối cảnh thiết kế (render), màu tường xám trong ảnh render không phải màu thực tế — tòa C7 ngoài đời sơn **màu trắng sáng** như trong 3 ảnh chụp thực tế còn lại (`c7-flycam-toan-canh.jpg`, `C7 từ trên cao.jpg`, `c7-san-trong-mat-tien.jpg`).
- **`c1/c1-san-truoc-i-love-bk-03.jpg`** có màu bầu trời đã qua chỉnh màu (tím/hồng), chỉ dùng phần kiến trúc Tòa C1, sân trước và cụm chữ `I ❤ BK` làm chuẩn tỉ lệ.
