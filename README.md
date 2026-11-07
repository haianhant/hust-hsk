# Bách khoa Hán ngữ 3D

Website học tiếng Trung 3D: người chơi là sinh viên Đại học Bách khoa Hà Nội, đi bộ trong khuôn viên trường thu nhỏ để học từ vựng HSK 3–4 qua nhiệm vụ, sổ tay, lịch ôn SRS. Không cần đăng nhập — tiến độ lưu trên máy người học (localStorage).

- Nội dung từ vựng: 1.057 từ / 29 bài / 50 quest (HSK 3 đủ 246 từ, HSK 4 đủ 811 từ). HSK 5 chưa có nguồn nên đang khóa.
- Công nghệ: Next.js 14 (static export) + React Three Fiber + Tailwind. Deploy production: https://hust-hsk.vercel.app/
- Nội dung học lấy từ website hoc-hsk của tác giả (chỉ đọc, không sửa).

## Chạy local

```bash
npm install
npm run dev     # chạy thử ở localhost:3000
npm run build   # build ra thư mục out/ (static export)
```

## Test

```bash
node test/learn.test.cjs   # engine học: 45 test
node test/leg-sim.cjs      # 4 chặng đi bộ
```

Dự án học tập độc lập, tái hiện Bách khoa Hà Nội; không phải website chính thức của Đại học.
