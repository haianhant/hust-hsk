# PROJECT BRIEF — HUSTVerse — Bách Khoa 3D (tiền thân: Bách khoa Hán ngữ 3D)

- **Tên sản phẩm chính thức:** HUSTVerse — Bách Khoa 3D
- **Địa chỉ Web Production chính thức:** `https://hustverse.vercel.app/`
- **Ngày bắt đầu:** 05/11/2026
- **Ngôn ngữ sản phẩm:** tiếng Việt; nội dung học: tiếng Trung giản thể + pinyin + nghĩa tiếng Việt
- **Nguồn học:** https://hoc-hsk.vercel.app/ (website tự dựng của user — CHỈ ĐỌC, không sửa, không deploy đè)
- **Ghi chú giới thiệu bắt buộc:** "Dự án học tập độc lập, tái hiện Bách khoa Hà Nội; không phải website chính thức của Đại học." Không gọi điểm game là điểm học phần thật.

## Mục tiêu (3 tiêu chí đồng thời)
1. Nhìn công trình chính phải nhận ra Bách khoa Hà Nội qua hình dáng/tỉ lệ/mặt đứng/cảnh quan, không chỉ qua biển tên.
2. Học đúng nội dung từ website nguồn; kết quả học lưu được và ôn lại được (localStorage, không tài khoản).
3. Trải nghiệm nhập vai 3D hoàn chỉnh, điều khiển tốt trên PC và điện thoại.

## Phạm vi
- Campus cô đọng (không phải digital twin 1:1, ghi rõ trong giới thiệu): cổng Parabol, C1 + sân, thư viện Tạ Quang Bửu, Hồ Tiền, C9/cầu đỏ, đường cây.
- **Mốc tư liệu mặc định:** campus TRƯỚC đợt di dời cổng Parabol tháng 11/2026.
- Tuyến mẫu đầu tiên: "Buổi học đầu tiên" — đủ 9 từ nhóm 1 HSK 3 bài 10 (数学, 认真, 笔记, 清楚, 黑板, 把, 作业, 遍, 提高).
- Mở rộng sau: HSK 3 bài 10–18, rồi HSK 4 bài 1–20. Không tự thêm HSK 3 bài 1–9 hay HSK 5 khi nguồn chưa có.

## Giới hạn đã chốt
- Không sao chép toàn văn bài khóa / dịch toàn văn / copy audio gốc nhà xuất bản. Ví dụ tự viết gắn nhãn `authored`, không trình bày là trích nguyên văn.
- Không dựng người chơi/điểm giả rồi thể hiện là dữ liệu thật. Không multiplayer, không leaderboard online ở bản đầu.
- Không dùng tên `hoc-hsk` (project cũ của user, đã xóa theo lệnh 24/10/2026 để user tự làm).
- Domain Production hiện tại là `https://hustverse.vercel.app/` (trước ngày 13/11/2026 khởi tạo project Vercel và đã nâng cấp sang tên miền chính thức `hustverse.vercel.app`).

## Lộ trình (theo brief)
Bước 0 khởi tạo → Bước 1 audit nội dung + tư liệu campus → Bước 2 blockout 3D → Bước 3 landmark → Bước 4 engine học tập → Bước 5 tuyến "Buổi học đầu tiên" → Bước 6 mở rộng HSK 3 → Bước 7 mở rộng HSK 4 → Bước 8 tiến độ/ôn tập → Bước 9 tối ưu/mobile → Bước 10 triển khai/bàn giao.

## Trạng thái
- Bước 0: đang làm (brief này + cấu trúc repo).
- Bước 1: đang chạy — audit nội dung nguồn + tư liệu campus (2 luồng song song).
