# HUSTVerse — Bách Khoa 3D

**Không gian Mô phỏng & Game 3D Tương tác Khuôn viên Đại học Bách khoa Hà Nội (HUST)**

Bước vào thế giới mở 3D **Đại học Bách khoa Hà Nội** ngay trên trình duyệt: hóa thân thành sinh viên Bách Khoa trong 10 mẫu đồng phục thật, đi bộ hoặc lái xe máy qua các công trình biểu tượng (Cổng Parabol, Quảng trường C1, Cổng Trần Đại Nghĩa 2 làn nhập 1, Tòa C7, Trường Vật liệu SMSE, Cụm D3–D5–D7–D9, Thư viện Tạ Quang Bửu 10 tầng, Hồ Tiền, Nhà Cựu sinh viên, B1 SoICT, Khu KTX & SVĐ), check-in sưu tầm Sổ tay Bách Khoa, ngồi tự học nhóm cùng bạn bè theo thời gian thực (Multiplayer) và bật/tắt linh hoạt các chế độ trải nghiệm.

---

## 🎮 Hệ thống Chế độ Trải nghiệm (Core World + Pluggable Modes)

- **🏛️ Chế độ Cốt lõi — Khám phá & Tương tác Bách Khoa 3D (Luôn bật):**
  - Tái hiện khuôn viên chuẩn bản đồ số [`https://hustmap.com/`](https://hustmap.com/) và ảnh chụp thực tế tại `tham-khao/`.
  - Chu kỳ ánh sáng Ngày / Hoàng hôn / Đêm theo giờ thực, đài nhạc Lofi Chill 75 BPM, lái xe máy quanh trường, dịch chuyển nhanh, biểu cảm 3D (Emotes `1–6`) và trò chuyện trực tuyến đa kênh (`Kênh BK 1–5`).
  - **HUSTVerse Passport:** Check-in & khám phá câu chuyện kiến trúc – tính năng tương tác riêng tại 9 địa danh biểu tượng.
- **🍅 Chế độ Tự học & Kết nối (`Co-Study Mode`):**
  - Đi thang máy khám phá 10 tầng **Thư viện Tạ Quang Bửu**, giữ chỗ ngồi học thời gian thực (Server-Authoritative Seats), đồng hồ Pomodoro, Focus Mode, chơi Đại dương cầm Tầng 6, ngắm bầu trời sao Tầng 10 và Bảng xếp hạng giờ học toàn trường.
- **🇨🇳 Chế độ Học tiếng Trung (`HSK Mode` — Tùy chọn Bật/Tắt):**
  - Mặc định **TẮT** để giữ trọn trải nghiệm game mô phỏng sân trường gọn sạch; bấm nút **`🇨🇳 HSK`** trên màn hình chính hoặc thanh HUD để **BẬT** bất cứ lúc nào.
  - Khi bật: mở khóa Giảng đường HSK tại **Tòa C7**, thẻ từ vựng chuyên đề từng tòa nhà và kho **1.057 từ vựng HSK 3–4** (29 bài, 50 nhiệm vụ, ôn tập ngắt quãng SRS & Sổ lỗi cá nhân lưu trực tiếp trên `localStorage`).

---

## 🛠️ Công nghệ & Kiến trúc

- **Stack:** Next.js 14 (`output: 'export'`) + React Three Fiber / Three.js (Procedural PBR Canvas Textures, 0 external GLB) + Tailwind CSS + Cloudflare Worker & Durable Object SQLite (`worker/`).
- **Tài liệu Kiến trúc & Đặc tả Hệ thống:**
  - **[Trung tâm Tài liệu Kiến trúc (`docs/README.md`)](./docs/README.md)**
  - **[Tầm nhìn Sản phẩm & Hệ thống Modes (`docs/product/vision.md`)](./docs/product/vision.md)**
  - **[Hướng dẫn dành cho AI Agents (`AGENTS.md`)](./AGENTS.md)** & **[Quy tắc Dự án (`GEMINI.md`)](./GEMINI.md)**
  - **[Tư liệu Ảnh Tham khảo Thực tế (`tham-khao/README.md`)](./tham-khao/README.md)**

---

## 🚀 Chạy Local & Kiểm thử (`Verification Gates`)

```bash
npm install
npm run dev     # Chạy môi trường phát triển tại http://localhost:3000
npm run build   # Xuất bản tĩnh ra thư mục out/
```

```bash
npm run typecheck        # Kiểm tra kiểu TypeScript (Frontend + Shared + Worker)
npm test                 # Chạy toàn bộ các bộ kiểm thử tự động dưới đây:
  npm run test:learn     # 45/45 unit tests Engine học HSK 3–4 & SRS
  npm run test:contracts # 5/5 tests Shared Contracts & DO Hibernation
  npm run test:nav       # 4/4 chặng di chuyển sân trường (test/leg-sim.cjs)
  npm run test:mp        # 12/12 kịch bản giao thức WebSocket Multiplayer
```

---

*Dự án mô phỏng & sáng tạo độc lập tái hiện khuôn viên Đại học Bách khoa Hà Nội; không phải website chính thức của nhà trường.*
