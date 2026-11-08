# Cổng Kiểm thử Bắt buộc (`Verification Gates`)

Tài liệu này quy định các cổng kiểm thử tự động bắt buộc chạy và đạt `PASS (exit code 0)` trước khi hoàn tất bất kỳ thay đổi nào về dữ liệu thế giới, kiến trúc 3D, logic học tập hoặc giao thức Multiplayer.

---

## 1. Sáu Cổng Kiểm thử Cốt lõi (Chạy trên Node.js & CI)

Toàn bộ 6 cổng dưới đây được cấu hình trong [`package.json`](file:///home/bao/Hust3D/hust-hsk/package.json) và thực thi tự động trên GitHub Actions ([`.github/workflows/ci.yml`](file:///home/bao/Hust3D/hust-hsk/.github/workflows/ci.yml)):

| # | Lệnh thực thi | Phạm vi Kiểm chứng | Tiêu chuẩn PASS |
|---|---|---|---|
| **1** | `npm run typecheck` | Chạy `tsc --noEmit` cho Frontend + `shared/` và `tsc --noEmit -p worker/tsconfig.json` cho Cloudflare Worker. | `0` lỗi kiểu TypeScript. |
| **2** | `npm run test:learn` (`node test/learn.test.cjs`) | Kiểm thử đơn vị toàn bộ Engine học HSK 3 (246 từ) + HSK 4 (811 từ), 50 quest, chuẩn hóa Pinyin, tính điểm SRS, lịch ôn 7 ngày, sổ lỗi, 6 huy hiệu toàn cục, streak và xuất/nhập JSON. | `45/45` bài test PASS. |
| **3** | `npm run test:contracts` (`node --test test/shared-contracts.test.cjs`) | Kiểm thử đồng bộ `BOUNDS`/`SPAWN` giữa Frontend và Worker, hàm kẹp tọa độ `clampToWorldBounds`, bộ lọc `sanitizeName`/`sanitizeMssv`/`extractValidAppearance`, giới hạn tốc độ đi bộ/đi xe `clampMoveStep` và khôi phục phiên `HskRoom` Durable Object sau WebSocket Hibernation + reconnect. | `5/5` bài test PASS. |
| **3b** | `npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study` | Kiểm thử đơn vị cho dữ liệu thế giới (`6/6`), hệ thống 10 đồng phục & dáng đi (`3/3`), điều phối bài học & ưu tiên tương tác 5 tầng (`3/3`), và hợp đồng/state machine Pomodoro + Study Session + Focus Mode + Seat Occupancy + Presence (`6/6`). | `18/18` bài test PASS. |
| **4** | `npm run test:nav` (`node test/leg-sim.cjs`) | Mô phỏng vật lý người đi bộ qua 4 chặng chính trong sân trường (`Cổng Parabol → Nhà C9 → Quảng trường C1 → Thư viện → Bờ Hồ Tiền`) kết hợp định tuyến A* theo mạng lưới `ROADS` và kiểm tra điểm `SPAWN`. | `4/4` chặng đến đích trong bán kính `1.5m`, `spawnCheck.pass === true`. |
| **5** | `npm run test:mp` (`node test/mp-protocol.cjs`) | Khởi chạy WebSocket Shim ([`test/ws-shim/server.js`](file:///home/bao/Hust3D/hust-hsk/test/ws-shim/server.js)) và chạy 12 kịch bản giao thức hai client ([`test/ws-shim/test-clients.js`](file:///home/bao/Hust3D/hust-hsk/test/ws-shim/test-clients.js)): `/health`, `/api/rooms`, chặn MSSV sai, `welcome`, `join`, đổi `appearance` trực tiếp, `move`, kẹp biên `-96`, reconnect cùng `sessionId`, `ping`/`pong`, `leave`. | `12/12` kịch bản PASS (`exit=0`). |
| **6** | `npm run build` (`next build`) | Biên dịch production Next.js, chạy ESLint/TypeScript validation và xuất bản tĩnh ra thư mục `out/`. | Xuất tĩnh thành công (`exit=0`). |

### Lệnh chạy nhanh toàn bộ chuỗi kiểm thử cốt lõi

```bash
npm run typecheck && npm test && npm run build
```

---

## 2. Kiểm thử Vật lý & Tương tác Bổ sung (Node.js)

- **Kiểm thử đi bộ vào cửa Thư viện Tạ Quang Bửu & điểm đứng quanh Thư viện:**
  ```bash
  node test/walk-to-library-door.cjs
  ```
  Xác minh người chơi đi bộ từ đường đông hồ `(24, 28)` vòng qua tiền cảnh và bệ chữ `HUST` vào tới điểm kích hoạt cửa sảnh chính `(38, 22.5)` mà không bị kẹt collider.

---

## 3. Bộ Kiểm thử Trình duyệt Headless (Playwright + Chromium)

Khi thay đổi giao diện HUD, luồng nhiệm vụ, xe máy, dịch chuyển nhanh hoặc ngoại hình 3D, có thể chạy thêm các bài kiểm thử trình duyệt (yêu cầu phục vụ thư mục `out/` qua HTTP server tĩnh ở cổng `8321`, ví dụ `python3 -m http.server 8321 --directory out`):

| Lệnh | Mục đích |
|---|---|
| `node test/fast-travel-check.cjs` | Kiểm chứng 6 điểm Dịch chuyển nhanh, hướng nhìn camera/avatar sau khi đáp và chống bấm chồng (20/20 bước). |
| `node test/ride-check.cjs` | Kiểm chứng gọi xe máy, lên/xuống xe bằng phím `E`, tốc độ tối đa, va chạm thân cây/tường và chặn lái xe vào phòng học (22/22 bước). |
| `node test/pinyin-input.cjs` | Kiểm chứng nhập Pinyin có dấu và không dấu (`toneless`), đảm bảo gõ phím `a/w/s/d` trong ô nhập không làm trôi nhân vật (11/11 bước). |
| `node test/step8-check.cjs` | Kiểm chứng giao diện Sổ tay, Lịch ôn 7 ngày, Sổ lỗi, Huy hiệu và Phiên ôn tập nhanh Flashcard (13/13 bước). |
| `node test/smoke-step6.cjs` | Kiểm chứng mở menu chọn bài HSK 3 (9 bài) & HSK 4 (20 bài) và khởi động bước đầu tiên của nhiệm vụ (22/22 bước). |

> [!NOTE]
> Trong môi trường máy ảo không có GPU phần cứng (chạy qua trình kết xuất phần mềm SwiftShader), tốc độ khung hình đạt khoảng `1–2 FPS`. Nếu không chạy các bài test Playwright do giới hạn thời gian hoặc chưa bật server tĩnh, phải báo cáo rõ trạng thái `NOT RUN` kèm lý do trong báo cáo nghiệm thu.
