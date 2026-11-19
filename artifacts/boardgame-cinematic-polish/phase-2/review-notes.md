# Phase 2 — Victory & Defeat Cinematic V2 — Evidence & Review Notes

- **Ngày đo:** 2026-11-19T06:02:49.523Z
- **Môi trường:** Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present
- **An toàn & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, Pre-end privacy leak = false, F5 non-replay verified = true

## 1. So sánh Before / After (Trận Multiplayer Thật 4 người + 1 Khán giả trên `BoardGameMatchDO`)

| Tiêu chí | Before (`before-victory.mp4`) | After (`after-victory-defeat.mp4`) |
| --- | --- | --- |
| Hành vi khi trận chuyển `FINISHED` | Modal `MatchResult` bật ngay tức thì ở `z-50`, che lấp bàn chơi và không có chuỗi 4 pha | Chạy chuỗi 4 pha `anticipation → faction-reveal → impact → settle` (2574ms), sau đó mới chuyển mượt sang `MatchResult` + `MatchPostcard` |
| Phân biệt Victory / Defeat / Spectator | Chỉ hiện banner chung `CHIẾN THẮNG` | Phân tách rõ `CHIẾN THẮNG` / `THẤT BẠI` / `KẾT THÚC VÁN ĐẤU` (Khán giả) cả màu sắc, hạt Canvas 2D & WebAudio |
| Kết quả trận thật ghi hình | Phe thắng: `mist-order` (P1: `defeat`) | Phe thắng: `mist-order` (P1: `defeat`, pha quan sát: `anticipation -> faction-reveal -> impact -> settle`) |
| Video 1920×1080 MP4 | `before-victory.mp4` (21.95s, 1.14 MB) | `after-victory-defeat.mp4` (14.3s, 0.74 MB) |
| FPS khi đang quay MP4 1080p (SwiftShader) | 6.24 FPS (p95=366.6ms) | 5.91 FPS (p95=400ms) |

## 2. Kiểm chứng đủ 3 Phe × 3 Trạng thái (Controlled `/boardgame-prototype` Showcase)

- **Video:** [`after-factions-showcase.mp4`](./after-factions-showcase.mp4) (16.76s, 0.40 MB, FPS quay = 3.98 FPS)
- **Stage 1→2 — Faction Reveal trước nhịp Impact (Đội Săn Đêm):** [`after-02-stage1-anticipation-lantern.png`](./screenshots/after-02-stage1-anticipation-lantern.png)
- **Stage 2→3 — Chuyển tiếp Impact & Shockwave (Đội Săn Đêm):** [`after-03-stage2-faction-reveal-lantern.png`](./screenshots/after-03-stage2-faction-reveal-lantern.png)
- **Stage 3 — Impact Victory (Đội Săn Đêm):** [`after-05-victory-lantern-guard-impact.png`](./screenshots/after-05-victory-lantern-guard-impact.png)
- **Stage 3 — Impact Defeat (Hội Bóng Đêm):** [`after-06-defeat-mist-order-impact.png`](./screenshots/after-06-defeat-mist-order-impact.png)
- **Stage 3 — Impact Spectator (Kẻ Độc Hành):** [`after-07-spectator-wanderer-impact.png`](./screenshots/after-07-spectator-wanderer-impact.png)
- **Skip Animation & Reduced Motion (`<= 280ms`, tự khép nhanh không chặn thao tác):** [`after-08-reduced-motion-victory.png`](./screenshots/after-08-reduced-motion-victory.png)

## 3. Ảnh chụp các giai đoạn trận thật

- **Before (bật modal ngay, không cinematic):** [`before-01-match-end-instant-modal.png`](./screenshots/before-01-match-end-instant-modal.png), [`before-02-match-result-postcard.png`](./screenshots/before-02-match-result-postcard.png)
- **After Trận thật — Stage 3 Defeat Impact trên bàn 4 người (Hội Bóng Đêm thắng, giữ ẩn MatchResult):** [`after-01-live-faction-reveal.png`](./screenshots/after-01-live-faction-reveal.png)
- **After Trận thật — Stage 4 Settle → MatchResult & MatchPostcard:** [`after-04-live-settle-match-postcard.png`](./screenshots/after-04-live-settle-match-postcard.png)