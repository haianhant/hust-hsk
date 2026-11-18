# AAA-Level Cinematic & Game Feel Polish — Evidence & Review Report

- **Ngày đo:** 2026-11-18T16:42:26.947Z
- **Môi trường chạy:** Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present
- **Video Trước (Baseline):** `before-gameplay.mp4` (156.74s, FPS quay baseline = 11.46 FPS, p95 = 166.7ms)
- **Video Sau (Polished Full):** `after-gameplay-full.mp4` (1920×1080, 143.24s, 6.13 MB, WebAudio Tab Track = Có)
- **Video Sau (Highlights):** `after-cinematic-highlights.mp4` (71.14s, 3.46 MB)
- **FPS Chơi Thật (Unrecorded Live Play, ~61.72s):** **21.24 FPS** (min/s=1, max/s=26, p50=50ms, p95=50.1ms, drops >25ms=1308, drops >33ms=935)
- **FPS Khi Đang Quay MP4 1080p (During Recording, 143.28s):** **7.57 FPS** (min/s=1, max/s=13, p50=100ms, p95=316.6ms, drops >33ms=1003)
- **Kiểm tra sạch lỗi & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, Invite code redacted = true

---

## 1. So sánh Timing & VFX Trước/Sau

| Hạng mục | Số lần quan sát | Thông số đo thực tế | Ghi chú chất lượng |
| --- | --- | --- | --- |
| Role Reveal 3D + Spotlight | 6 | 1710ms (lantern-guard), 1704ms (mist-order), 1719ms (lantern-guard), 1707ms (mist-order), 1715ms (lantern-guard), 1690ms (lantern-guard) | Có làm tối nền, spotlight nhân vật, thẻ 3D xoay lật & hạt theo phe |
| Combat 75ms Hit-Stop Flash | 51 | hitStop=75ms, 75ms, 75ms, 75ms, 75ms, 75ms | Chuỗi Target Lock -> Travel -> 75ms Hit-Stop + Flash -> Floating Damage |
| Xúc xắc 3D & Clack Spark | 31 | duration=1422ms, 1319ms, 1423ms, 1322ms, 1422ms | Bouncing deceleration, tia va chạm khi tumble & vòng khóa settle |
| Rút bài Bay từ Deck + Lật 3D | 15 | duration=849ms (investigation), 875ms (equipment), 878ms (event), 866ms (equipment), 1149ms (event) | Quỹ đạo từ Deck tới tâm, màu radar/hex/surge theo bộ bài |
| WAAPI Parabolic Pawn Glide | 21 | 1848, 1848, 1848, 1848, 1848 ms | Quỹ đạo nhảy có đỉnh & drop-shadow động + touchdown ripple |
| WebAudio Cues | 1 session | osc=2022, pcm=295 | Đồng bộ âm thanh Reveal, Parry-Riposte 2 nhịp, Card Play & Victory |

---

## 2. Mốc Timeline & Screenshots

| Thời điểm (`MM:SS.mmm`) | Loại | Chi tiết / Ảnh |
| --- | --- | --- |
| `00:00.000` | `MATCH_START` | Bắt đầu quay bản Polished AAA tại 1920x1080 (P1=gac-radio) |
| `00:01.063` | `SCREENSHOT` | Cut-in chuyển lượt tới P1 ([14-turn-transition-your-turn.png](./screenshots/14-turn-transition-your-turn.png)) |
| `00:01.232` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #1) |
| `00:03.115` | `SCREENSHOT` | Xúc xắc 3D lăn & tia va chạm D6-D4 ([01-dice-tumble-clack-spark.png](./screenshots/01-dice-tumble-clack-spark.png)) |
| `00:04.513` | `SCREENSHOT` | Xúc xắc 3D chốt kết quả với vòng khóa Settle Ring ([02-dice-settled-ring.png](./screenshots/02-dice-settled-ring.png)) |
| `00:05.383` | `SCREENSHOT` | Highlight ô đích theo tổng D6+D4 ([03-location-destination-highlight.png](./screenshots/03-location-destination-highlight.png)) |
| `00:06.534` | `SCREENSHOT` | Quân cờ nhảy parabol & touchdown ripple ([04-pawn-glide-arc-touchdown.png](./screenshots/04-pawn-glide-arc-touchdown.png)) |
| `00:07.690` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `00:10.029` | `SCREENSHOT` | Rút bài bay từ Deck lên tâm + vầng hào quang theo bộ bài ([05-card-draw-flight-flip.png](./screenshots/05-card-draw-flight-flip.png)) |
| `00:12.789` | `SCREENSHOT` | Modal Card Zoom mặt trước ([06-card-zoom-modal-front.png](./screenshots/06-card-zoom-modal-front.png)) |
| `00:14.930` | `SCREENSHOT` | Card Zoom lật 3D mặt lưng Ấn Ký ([07-card-zoom-modal-back.png](./screenshots/07-card-zoom-modal-back.png)) |
| `00:18.375` | `P1_REVEAL_ROLE` | P1 (Vy "Radio") lật vai công khai |
| `00:20.001` | `SCREENSHOT` | Lật vai Pha Anticipation: Tối bàn + Spotlight nhân vật + Mặt lưng 3D ([11-role-reveal-spotlight-anticipation.png](./screenshots/11-role-reveal-spotlight-anticipation.png)) |
| `00:23.287` | `SCREENSHOT` | Đường ngắm SVG mục tiêu ([08-attack-targeting-line.png](./screenshots/08-attack-targeting-line.png)) |
| `00:23.287` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `00:26.088` | `SCREENSHOT` | Khoảnh khắc Hit-Stop 75ms, Impact Flash & Floating Damage ([09-combat-hitstop-impact-flash.png](./screenshots/09-combat-hitstop-impact-flash.png)) |
| `00:31.741` | `SCREENSHOT` | Emote, Thang thương tích mở rộng & Tab Trang bị ([15-multiplayer-emote-damage-track.png](./screenshots/15-multiplayer-emote-damage-track.png)) |
| `00:35.859` | `PEER_ATTACK` | Sinh viên Bình tấn công Sinh viên Chi |
| `00:41.369` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên Dung |
| `00:47.447` | `PEER_REVEAL_DUNG` | Sinh viên Dung (Dũng Gác Cổng) lật vai công khai |
| `00:50.003` | `SCREENSHOT` | Lật vai Pha Faction-Reveal/Impact: Card 3D xoay mở chân dung + Huy hiệu & hạt theo phe ([12-role-reveal-3d-flip-impact.png](./screenshots/12-role-reveal-3d-flip-impact.png)) |
| `00:51.564` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #5) |
| `00:53.016` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `00:56.476` | `P1_USE_SKILL` | P1 kích hoạt kỹ năng đặc biệt nhân vật |
| `00:58.283` | `SCREENSHOT` | Kỹ năng đặc trưng + Canvas Aura & Cut-in không che bàn ([13-signature-skill-cutin-vfx.png](./screenshots/13-signature-skill-cutin-vfx.png)) |
| `01:00.776` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:04.737` | `WS_RECONNECT_TEST` | Kiểm tra ngắt và tự nối lại WebSocket giữa trận |
| `01:19.301` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #9) |
| `01:22.216` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:25.759` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:35.256` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên Bình |
| `01:38.522` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #13) |
| `01:39.953` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:42.064` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:53.816` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #17) |
| `01:55.292` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:57.490` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `02:06.163` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #20) |
| `02:08.057` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `02:11.583` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `02:18.155` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên An |
| `02:23.116` | `SCREENSHOT` | Màn hình Tổng kết trận đấu theo phe thắng & MatchPostcard ([16-victory-fireworks-and-match-result.png](./screenshots/16-victory-fireworks-and-match-result.png)) |
| `02:23.278` | `CAPTURE_STOP` | Hoàn tất ghi hình sau 143.3s |
