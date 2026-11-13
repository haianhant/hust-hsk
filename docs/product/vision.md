# Tầm nhìn Sản phẩm — HUSTVerse — Bách Khoa 3D

## 1. Định vị Sản phẩm

**HUSTVerse — Bách Khoa 3D** là **không gian mô phỏng & game 3D tương tác trực tuyến** tái hiện khuôn viên **Đại học Bách khoa Hà Nội (HUST)** ngay trên trình duyệt web (**[`https://hustverse.vercel.app/`](https://hustverse.vercel.app/)**), được thiết kế theo kiến trúc **Thế giới Lõi + Chế độ Gắn rời (Core World + Pluggable Modes)**:

1. **Lớp Lõi — Mô phỏng Khuôn viên & Game Tương tác 3D (Core Campus Sandbox & Social — Luôn bật):**
   - Người chơi hóa thân thành sinh viên Bách Khoa với 10 mẫu đồng phục HUST thực tế, tự do đi bộ hoặc lái xe máy qua các phân khu chuẩn bản đồ số [`https://hustmap.com/`](https://hustmap.com/), check-in sưu tầm **HUSTVerse Passport** tại 9 địa danh biểu tượng, trò chuyện và thể hiện biểu cảm 3D (Emotes) cùng bạn bè thời gian thực trên các kênh Multiplayer (`Kênh BK 1–5`).
2. **Chế độ Tự học & Không gian Học chung (`Co-Study Mode`):**
   - Bước vào 10 tầng **Thư viện Tạ Quang Bửu**, giữ chỗ ngồi học thực tế có đồng bộ máy chủ (Authoritative Seat Occupancy), bật đồng hồ Pomodoro & Focus Mode, tấu nhạc trên Đại dương cầm Tầng 6, ngắm sao Tầng 10 và thi đua trên Bảng xếp hạng giờ học Bách Khoa.
3. **Chế độ Học tiếng Trung (`HSK Mode` — Tùy chọn Bật/Tắt linh hoạt):**
   - Được tách thành một chế độ độc lập (`lib/gameModes.ts`), **mặc định TẮT (`OFF`)** đối với người chơi mới để giao diện gọn thoáng, thu hút mọi sinh viên/cựu sinh viên yêu thích khám phá Bách Khoa 3D.
   - Khi người chơi bật **`🇨🇳 HSK Mode`** ngay trên màn hình khởi đầu hoặc thanh HUD, hệ thống mở khóa trọn vẹn Giảng đường HSK tại Tòa C7, 50 nhiệm vụ tương tác, 1.057 từ vựng HSK 3–4, phát âm tiếng Trung và lịch ôn tập ngắt quãng (SRS).

> [!IMPORTANT]
> **Tuyên bố Độc lập:** Đây là dự án mô phỏng và học tập độc lập tái hiện khuôn viên Đại học Bách khoa Hà Nội, **không phải** website chính thức của nhà trường. Điểm thưởng trong game là điểm khám phá & động lực cá nhân, không phải điểm học phần thực tế.

---

## 2. Ba Tiêu chí Cốt lõi Đồng thời

1. **Nhận diện Kiến trúc Thực tế (Authentic HUST Architecture):**
   - Người chơi nhận ra ngay Đại học Bách khoa Hà Nội nhờ hình khối, tỉ lệ, mặt đứng, vật liệu và cảnh quan dựa trên bản đồ số chuẩn [`https://hustmap.com/`](https://hustmap.com/) (giới hạn gọn trong phạm vi khuôn viên ĐHBK Hà Nội, không mở rộng quá rộng ra khu vực ngoài trường) và bộ ảnh chụp thực tế tại `tham-khao/` — không chỉ dựa vào biển tên.
   - Mốc không gian chuẩn: Khuôn viên HUST **trước đợt di dời Cổng Parabol tháng 11/2026** (Cổng Parabol nằm tại biên phía Tây giáp đường Giải Phóng).
2. **Trải nghiệm Mượt mà, Không Rào cản & Lưu trữ Bền vững (Zero-Friction, Persistent Play):**
   - Vào chơi ngay trong 1 cú nhấp chuột mà không yêu cầu đăng ký tài khoản phức tạp; hồ sơ nhân vật, đồng phục, tiến độ Check-in Passport, lựa chọn chế độ (`HSK Mode`) và dữ liệu học tập được lưu an toàn trong `localStorage` kèm tính năng Xuất/Nhập JSON sao lưu.
3. **Hiệu năng Web 3D Đa thiết bị (Cross-Platform WebGL):**
   - Tải nhanh, xuất tĩnh (`next build` → `out/`), dùng vật liệu PBR sinh tự động bằng Canvas 2D (`THREE.CanvasTexture`) mà không cần tải hàng chục MB mô hình GLB/texture ngoài.
   - Điều khiển đầy đủ trên cả máy tính (WASD + chuột + phím tắt) và điện thoại di động (Joystick cảm ứng + nút tương tác).

---

## 3. Ràng buộc & Phi mục tiêu (Constraints & Non-Goals)

- **Tách biệt sạch giữa Thế giới 3D Lõi và các Mode mở rộng:** Khi `HSK Mode` tắt, giao diện HUD, Sổ tay Khám phá và hội thoại mặc định không ép hiển thị bài kiểm tra hay từ vựng tiếng Trung; mọi tài nguyên và tiến độ HSK vẫn được bảo toàn nguyên vẹn khi bật lại.
- **Tính trung thực của dữ liệu Multiplayer:** Không tạo người chơi ảo giả làm người chơi trực tuyến thật; không tạo bảng xếp hạng ảo; khi mất kết nối tới Cloudflare Worker thì hiển thị rõ trạng thái chơi một mình.
- **Bản quyền nội dung:** Với `HSK Mode`, chỉ sử dụng danh mục từ vựng, pinyin, nghĩa tiếng Việt và các câu ví dụ tự biên soạn (`authored: true`), không sao chép nguyên văn bài khóa hay âm thanh bản quyền của nhà xuất bản.
