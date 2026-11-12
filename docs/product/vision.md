# Tầm nhìn Sản phẩm — Bách khoa Hán ngữ 3D (`hust-hsk`)

## 1. Định vị Sản phẩm

**Bách khoa Hán ngữ 3D (`hust-hsk`)** là ứng dụng web 3D tương tác tái hiện khuôn viên **Đại học Bách khoa Hà Nội (HUST)** kết hợp hai trụ cột trải nghiệm:

1. **Học tiếng Trung HSK 3–4 theo ngữ cảnh nhập vai (Contextual Language Learning):** Người học hóa thân thành sinh viên Bách khoa đi bộ/lái xe qua các địa danh quen thuộc (Cổng Parabol, Nhà C9, Quảng trường C1, Thư viện Tạ Quang Bửu, Hồ Tiền) để thực hiện 50 nhiệm vụ tương tác, luyện 1.057 từ vựng HSK 3–4 với thuật toán lặp lại ngắt quãng (SRS) và sổ tay từ vựng cá nhân.
2. **Không gian Khuôn viên Ảo & Học tập Chung (HUST Virtual Study Campus):** Sinh viên tùy biến ngoại hình với 10 mẫu đồng phục HUST thật, gặp gỡ bạn học trực tuyến theo thời gian thực (Multiplayer Rooms) và hướng tới không gian tự học tập trung (Pomodoro Timer, Study Rooms, Focus Mode).

> [!IMPORTANT]
> **Tuyên bố Độc lập:** Đây là dự án học tập độc lập tái hiện khuôn viên Đại học Bách khoa Hà Nội, **không phải** website chính thức của nhà trường. Điểm thưởng trong ứng dụng là điểm động lực học tập cá nhân, không phải điểm học phần thực tế.

---

## 2. Ba Tiêu chí Cốt lõi Đồng thời

1. **Nhận diện Kiến trúc Thực tế (Authentic HUST Architecture):**
   - Người xem nhận ra ngay Đại học Bách khoa Hà Nội nhờ hình khối, tỉ lệ, mặt đứng, vật liệu và cảnh quan dựa trên bản đồ số chuẩn [`https://hustmap.com/`](https://hustmap.com/) (giới hạn gọn trong phạm vi khuôn viên ĐHBK Hà Nội, không mở rộng quá rộng ra khu vực ngoài trường) và bộ ảnh chụp thực tế tại `tham-khao/` — không chỉ dựa vào biển tên.
   - Mốc không gian chuẩn: Khuôn viên HUST **trước đợt di dời Cổng Parabol tháng 11/2026** (Cổng Parabol nằm tại biên phía Tây giáp đường Giải Phóng).
2. **Học tập Thực chất & Bền vững (Zero-Friction, Persistent Learning):**
   - Nội dung từ vựng chính xác (246 từ HSK 3 bài 10–18 và 811 từ HSK 4 bài 1–20).
   - Không yêu cầu tạo tài khoản hay đăng nhập phức tạp; toàn bộ tiến độ, lịch ôn SRS, sổ lỗi và hồ sơ nhân vật được lưu trữ an toàn trong `localStorage` kèm tính năng Xuất/Nhập JSON sao lưu.
3. **Hiệu năng Web 3D Mượt mà & Đa thiết bị (Cross-Platform WebGL):**
   - Tải nhanh, xuất tĩnh (`next build` → `out/`), dùng vật liệu PBR sinh tự động bằng Canvas 2D (`THREE.CanvasTexture`) mà không cần tải hàng chục MB mô hình GLB/texture ngoài.
   - Điều khiển đầy đủ trên cả máy tính (WASD + chuột) và điện thoại di động (Joystick cảm ứng + nút tương tác).

---

## 3. Ràng buộc & Phi mục tiêu (Constraints & Non-Goals)

- **Bản quyền nội dung học:** Chỉ sử dụng danh mục từ vựng, pinyin, nghĩa tiếng Việt và các câu ví dụ tự biên soạn (`authored: true`). Tuyệt đối không sao chép nguyên văn bài khóa hay tập tin âm thanh bản quyền của nhà xuất bản.
- **Tính trung thực của dữ liệu:** Không tạo người chơi ảo giả làm người chơi trực tuyến thật; không tạo bảng xếp hạng ảo; khi mất kết nối tới Cloudflare Worker thì hiển thị rõ trạng thái ngoại tuyến.
- **Tách biệt miền nghiệp vụ:** Engine học HSK (`lib/learn/*`) và các tính năng tự học tương lai (`Pomodoro`, `Study Session`) hoạt động độc lập với WebGL — có thể kiểm thử hoàn toàn trên Node.js và vẫn dùng được ngay cả khi người học chỉ mở giao diện Sổ tay/Ôn tập.
