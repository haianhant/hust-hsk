---
name: web-3d-visual-audit
description: >-
  Use this skill when auditing 3D scene quality, verifying collisions,
  running regression tests, or capturing Playwright visual screenshots
  after modifying 3D components or campus layout in hust-hsk.
---

# Web 3D Visual Audit & Scale Verification Skill

Quy trình kiểm định chất lượng đồ họa 3D, tỉ lệ kiến trúc, va chạm vật lý và hồi quy cho dự án **`hust-hsk`**.

## Các bước kiểm định (Verification Runbook)

### Bước 1: Kiểm tra Nhanh (Static Typecheck + Engine + Collision Sim + Build)
Chạy script kiểm định tự động:
```bash
bash .agents/skills/web-3d-visual-audit/scripts/quick-audit.sh
```
Script này thực thi tuần tự:
1. `npx tsc --noEmit` — Đảm bảo không lỗi TypeScript.
2. `node test/learn.test.cjs` — Kiểm tra 45 unit test của engine học HSK & SRS.
3. `node test/leg-sim.cjs` — Mô phỏng đi bộ qua 4 chặng chính (`Cổng Parabol → C9 → C1 → Thư viện → Hồ Tiền`) để xác nhận không có collider nào chặn đường.
4. `npm run build` — Build tĩnh ra thư mục `out/`.

### Bước 2: Kiểm tra Chi tiết bằng Trình duyệt Headless (Playwright)
Khi sửa đổi kiến trúc, dịch chuyển nhanh, xe máy hoặc giao diện:
1. Mở server tĩnh phục vụ thư mục `out/` ở cổng `8321` (nếu script test yêu cầu):
   ```bash
   python3 -m http.server 8321 --directory out
   ```
2. Chạy các bài kiểm thử chuyên biệt trong `test/`:
   - Kiểm tra đi bộ vào cửa Thư viện: `node test/walk-to-library-door.cjs`
   - Kiểm tra 6 điểm Dịch chuyển nhanh (Fast Travel): `node test/fast-travel-check.cjs`
   - Kiểm tra gọi và lái xe máy + va chạm thân cây: `node test/ride-check.cjs`
   - Kiểm tra gõ Pinyin không dấu thanh: `node test/pinyin-input.cjs`

### Bước 3: Danh sách Kiểm tra Thị giác (Visual Audit Checklist)
Khi chụp ảnh từ các script `test/shots-*.cjs` hoặc `test/r4-lib-shots.cjs`, luôn mở file ảnh `.png` bằng công cụ đọc file (`read_file`) và kiểm tra 6 tiêu chí:
1. **Không lơ lửng (No Floating Geometry):** Chân tường, cột đèn, ghế gỗ, thân cây, cành cây và bánh xe máy phải chạm đất/thân chính (hoặc nhúng `0.02–0.05m`).
2. **Không nhấp nháy mặt phẳng (No Z-Fighting):** Sàn quảng trường, đường nhựa, vỉa hè, khung cửa sổ và biển hiệu không có vệt sọc răng cưa do trùng mặt phẳng.
3. **Biển chữ đọc xuôi & rõ nét (Signage Legibility):** Biển tên công trình, đồng hồ, cờ Tổ quốc, chữ `I ❤️ BK`, chữ `HUST` và bảng tên NPC/Multiplayer không bị ngược chữ (`Mirrored`) và không bị mái hiên hay tán cây che khuất ở góc nhìn người chơi.
4. **Độ sáng mặt đứng (Facade Luminance):** Tường trắng ở cả 4 hướng Đông/Tây/Nam/Bắc đều đọc rõ là màu sáng (không bị bóng đen gắt biến thành tường xám đen), trong khi dưới mái hiên/hành lang vẫn có bóng âm trần tạo chiều sâu.
5. **Tỉ lệ con người (`1.7m` Standard):** Đặt nhân vật đứng cạnh cửa, bậc tam cấp, lan can, ghế đá để đối chiếu tỉ lệ hợp lý.
6. **Không lỗi Console/Page:** Mọi lượt chạy trình duyệt phải đạt `0 console errors` và `0 page errors`.
