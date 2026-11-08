# Bách khoa Hán ngữ 3D (`hust-hsk`)

Ứng dụng web 3D học tiếng Trung HSK 3–4 trong không gian khuôn viên **Đại học Bách khoa Hà Nội (HUST)**: người học hóa thân thành sinh viên Bách khoa đi bộ/lái xe qua các địa danh biểu tượng (Cổng Parabol, Nhà C9, Quảng trường C1, Thư viện Tạ Quang Bửu, Hồ Tiền, Tòa C7, B1 SoICT, Khu KTX) để thực hiện nhiệm vụ từ vựng, ôn tập theo lịch ngắt quãng (SRS) và gặp gỡ bạn học trực tuyến (Multiplayer).

- **Kho nội dung HSK 3–4:** **1.057 từ vựng** / **29 bài** / **50 nhiệm vụ** (HSK 3 đủ 246 từ bài 10–18; HSK 4 đủ 811 từ bài 1–20). Lưu tiến độ trực tiếp trên trình duyệt (`localStorage`), không cần đăng nhập.
- **Công nghệ:** Next.js 14 (`output: 'export'`) + React Three Fiber / Three.js + Tailwind CSS + Cloudflare Worker & Durable Object (`worker/`).
- **Production:** https://hust-hsk.vercel.app/

---

## Tài liệu Kiến trúc & Đặc tả Hệ thống

Toàn bộ tài liệu kiến trúc, quy ước hệ tọa độ, giao thức Multiplayer, đặc tả từng tòa nhà (`building.*`), đồng phục sinh viên (`avatar.*`) và các quyết định kỹ thuật (ADRs) được tổ chức tại:

- **[Trung tâm Tài liệu Kiến trúc (`docs/README.md`)](./docs/README.md)**
- **[Hướng dẫn dành cho AI Agents (`AGENTS.md`)](./AGENTS.md)** & **[Quy tắc Dự án (`GEMINI.md`)](./GEMINI.md)**
- **[Tư liệu Ảnh Tham khảo Thực tế (`tham-khao/README.md`)](./tham-khao/README.md)**

---

## Chạy Local

```bash
npm install
npm run dev     # Chạy môi trường phát triển tại http://localhost:3000
npm run build   # Xuất bản tĩnh ra thư mục out/
```

## Kiểm thử (`Verification Gates`)

```bash
npm run typecheck        # Kiểm tra kiểu TypeScript (Frontend + Shared + Worker)
npm test                 # Chạy toàn bộ 4 bộ kiểm thử tự động dưới đây:
  npm run test:learn     # 45/45 unit tests Engine học HSK 3–4 & SRS
  npm run test:contracts # 5/5 tests Shared Contracts & DO Hibernation
  npm run test:nav       # 4/4 chặng di chuyển sân trường (test/leg-sim.cjs)
  npm run test:mp        # 12/12 kịch bản giao thức WebSocket Multiplayer
```

---

*Dự án học tập độc lập tái hiện khuôn viên Đại học Bách khoa Hà Nội; không phải website chính thức của nhà trường.*
