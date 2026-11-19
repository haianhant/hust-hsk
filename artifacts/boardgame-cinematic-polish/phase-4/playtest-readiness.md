# Phase 4 — Opening & Secret Role Deal Cinematic — Playtest Readiness Report

**Captured:** 2026-11-19T11:20:14.647Z
**Viewport:** 1920×1080 (Live 4-Player + Real Spectator WebSocket Match via `BoardGameMatchDO`)

## Verification Matrix

| Hạng mục | Kết quả | Bằng chứng đo thực tế |
|---|---|---|
| 1. Game Start Stinger | **PASS** | `start-stinger` hiển thị vignette Midnight Noir + `ĐÊM XUỐNG TẠI KTX…` + âm thanh mở màn (`screenshots/after-01-start-stinger.png`) |
| 2. Shuffle / Deal Roles | **PASS** | `shuffle-deal` xáo & chia bài úp `MIDNIGHT_CARD_BACK_ART` có nhịp, 0 thông tin phe (`screenshots/after-02-shuffle-deal.png`) |
| 3. Personal Secret Role Reveal | **PASS** | `personal-reveal` lật 3D thẻ vai riêng (`cardFlippedAtMs=2908.2ms`) + subtitle `Vai bí mật của bạn · Hãy giữ bí mật` (`screenshots/after-03-personal-reveal.png`) |
| 4. Back To Board / First Turn Ready | **PASS** | `back-to-board` nhả backdrop mượt, highlight người đi trước & hoàn tất lượt tung xúc xắc đầu tiên (`screenshots/after-04-back-to-board.png`) |
| Tổng thời lượng Opening (2.5–4.0s) | **PASS** | Player: **3593.2ms** · Spectator: **2939.9ms** |
| Spectator P0 Isolation (0 lộ vai) | **PASS** | `spectator-check.mp4` + `screenshots/after-05-spectator-sealed.png`: **0** privacy violations, **0** `privateView`, **0** role flip, âm thanh trung tính phe |
| Skip Animation | **PASS** | Bấm `⏭️ Bỏ qua hiệu ứng` tắt hoàn toàn opening trong **37ms** (`screenshots/after-06-after-skip.png`) |
| Reconnect / F5 Non-Replay | **PASS** | F5 giữa lượt 1 & F5 ngay lượt 1 chưa tung đều **không** phát lại opening (`screenshots/after-07-f5-no-replay.png`) |
| Before / After Comparison | **PASS** | `before-opening-role-deal.mp4` (355 KB) vs `after-opening-role-deal.mp4` (340 KB) |
| Hiệu năng & Audio | **PASS** | Player: **6.05 FPS** (p95=300ms, osc=165, buf=13) · Spectator: **11.29 FPS** |
| Console / Page / Security Errors | **PASS** | 0 console errors · 0 page errors · 0 MSSV/P0 leaks |

## Ghi chú tự kiểm tra trước Playtest
- Toàn bộ hành vi chia vai thực tế vẫn 100% do server quyết định; `features/boardgame/domain/`, `worker/`, `shared/contracts/` giữ nguyên tuyệt đối.
- Âm thanh opening trung tính phe để người chơi cùng phòng không thể đoán phe qua loa ngoài.
- Nếu người chơi bấm tung xúc xắc ngay trong lúc opening đang chạy, overlay tự nhường mượt sang xúc xắc 3D mà không chặn thao tác hoặc chồng hình.
