# AAA-Level Cinematic & Game Feel Polish — Evidence & Review Report

- **Ngày đo:** 2026-11-18T15:16:38.284Z
- **Môi trường chạy:** Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present
- **Video Trước (Baseline):** `before-gameplay.mp4` (156.74s, FPS quay baseline = 11.46 FPS, p95 = 166.7ms)
- **Video Sau (Polished Full):** `after-gameplay-full.mp4` (1920×1080, 126.08s, 5.51 MB, WebAudio Tab Track = Có)
- **Video Sau (Highlights):** `after-cinematic-highlights.mp4` (87.19s, 3.81 MB)
- **FPS Chơi Thật (Unrecorded Live Play, ~61.04s):** **26.08 FPS** (min/s=1, max/s=30, p50=33.3ms, p95=50.1ms, drops >25ms=1572, drops >33ms=644)
- **FPS Khi Đang Quay MP4 1080p (During Recording, 126.17s):** **9.35 FPS** (min/s=3, max/s=15, p50=99.9ms, p95=200ms, drops >33ms=1131)
- **Kiểm tra sạch lỗi & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, Invite code redacted = true

---

## 1. So sánh Timing & VFX Trước/Sau

| Hạng mục | Số lần quan sát | Thông số đo thực tế | Ghi chú chất lượng |
| --- | --- | --- | --- |
| Role Reveal 3D + Spotlight | 5 | 1478ms (lantern-guard), 1475ms (mist-order), 1476ms (lantern-guard), 1468ms (mist-order), 1466ms (lantern-guard) | Có làm tối nền, spotlight nhân vật, thẻ 3D xoay lật & hạt theo phe |
| Combat 75ms Hit-Stop Flash | 31 | hitStop=75ms, 75ms, 75ms, 75ms, 75ms, 75ms | Chuỗi Target Lock -> Travel -> 75ms Hit-Stop + Flash -> Floating Damage |
| Xúc xắc 3D & Clack Spark | 16 | duration=1421ms, 1322ms, 2708ms, 1422ms, 1321ms | Bouncing deceleration, tia va chạm khi tumble & vòng khóa settle |
| Rút bài Bay từ Deck + Lật 3D | 8 | duration=868ms (investigation), 879ms (event), 1149ms (event), 1148ms (equipment), 879ms (investigation) | Quỹ đạo từ Deck tới tâm, màu radar/hex/surge theo bộ bài |
| WAAPI Parabolic Pawn Glide | 10 | 1848, 1848, 1848, 1848, 1848 ms | Quỹ đạo nhảy có đỉnh & drop-shadow động + touchdown ripple |
| WebAudio Cues | 1 session | osc=1656, pcm=156 | Đồng bộ âm thanh Reveal, Parry-Riposte 2 nhịp, Card Play & Victory |

---

## 2. Mốc Timeline & Screenshots

| Thời điểm (`MM:SS.mmm`) | Loại | Chi tiết / Ảnh |
| --- | --- | --- |
| `00:00.000` | `MATCH_START` | Bắt đầu quay bản Polished AAA tại 1920x1080 (P1=gac-radio) |
| `00:00.917` | `SCREENSHOT` | Cut-in chuyển lượt tới P1 ([14-turn-transition-your-turn.png](./screenshots/14-turn-transition-your-turn.png)) |
| `00:01.081` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #1) |
| `00:02.478` | `SCREENSHOT` | Xúc xắc 3D lăn & tia va chạm D6-D4 ([01-dice-tumble-clack-spark.png](./screenshots/01-dice-tumble-clack-spark.png)) |
| `00:03.374` | `SCREENSHOT` | Xúc xắc 3D chốt kết quả với vòng khóa Settle Ring ([02-dice-settled-ring.png](./screenshots/02-dice-settled-ring.png)) |
| `00:04.267` | `SCREENSHOT` | Highlight ô đích theo tổng D6+D4 ([03-location-destination-highlight.png](./screenshots/03-location-destination-highlight.png)) |
| `00:05.320` | `SCREENSHOT` | Quân cờ nhảy parabol & touchdown ripple ([04-pawn-glide-arc-touchdown.png](./screenshots/04-pawn-glide-arc-touchdown.png)) |
| `00:06.470` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `00:08.399` | `SCREENSHOT` | Rút bài bay từ Deck lên tâm + vầng hào quang theo bộ bài ([05-card-draw-flight-flip.png](./screenshots/05-card-draw-flight-flip.png)) |
| `00:10.997` | `SCREENSHOT` | Modal Card Zoom mặt trước ([06-card-zoom-modal-front.png](./screenshots/06-card-zoom-modal-front.png)) |
| `00:12.919` | `SCREENSHOT` | Card Zoom lật 3D mặt lưng Ấn Ký ([07-card-zoom-modal-back.png](./screenshots/07-card-zoom-modal-back.png)) |
| `00:16.494` | `P1_REVEAL_ROLE` | P1 (Vy "Radio") lật vai công khai |
| `00:17.821` | `SCREENSHOT` | Lật vai Pha Anticipation: Tối bàn + Spotlight nhân vật + Mặt lưng 3D ([11-role-reveal-spotlight-anticipation.png](./screenshots/11-role-reveal-spotlight-anticipation.png)) |
| `00:21.037` | `SCREENSHOT` | Đường ngắm SVG mục tiêu ([08-attack-targeting-line.png](./screenshots/08-attack-targeting-line.png)) |
| `00:21.037` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `00:22.988` | `SCREENSHOT` | Khoảnh khắc Hit-Stop 75ms, Impact Flash & Floating Damage ([09-combat-hitstop-impact-flash.png](./screenshots/09-combat-hitstop-impact-flash.png)) |
| `00:28.236` | `SCREENSHOT` | Emote, Thang thương tích mở rộng & Tab Trang bị ([15-multiplayer-emote-damage-track.png](./screenshots/15-multiplayer-emote-damage-track.png)) |
| `00:36.373` | `PEER_REVEAL_DUNG` | Sinh viên Chi (Dũng Gác Cổng) lật vai công khai |
| `00:38.645` | `SCREENSHOT` | Lật vai Pha Faction-Reveal/Impact: Card 3D xoay mở chân dung + Huy hiệu & hạt theo phe ([12-role-reveal-3d-flip-impact.png](./screenshots/12-role-reveal-3d-flip-impact.png)) |
| `00:39.470` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên An |
| `00:45.001` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên An |
| `00:48.565` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #5) |
| `00:49.976` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `00:52.089` | `P1_USE_SKILL` | P1 kích hoạt kỹ năng đặc biệt nhân vật |
| `00:54.028` | `SCREENSHOT` | Kỹ năng đặc trưng + Canvas Aura & Cut-in không che bàn ([13-signature-skill-cutin-vfx.png](./screenshots/13-signature-skill-cutin-vfx.png)) |
| `00:56.554` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:00.272` | `WS_RECONNECT_TEST` | Kiểm tra ngắt và tự nối lại WebSocket giữa trận |
| `01:10.329` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #8) |
| `01:12.098` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #8) |
| `01:14.577` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:17.624` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:20.387` | `SCREENSHOT` | Parry Shield + Vuốt Phản Kích & COUNTER popup ([10-counterattack-parry-riposte.png](./screenshots/10-counterattack-parry-riposte.png)) |
| `01:30.087` | `SCREENSHOT` | Màn hình Tổng kết trận đấu theo phe thắng & MatchPostcard ([16-victory-fireworks-and-match-result.png](./screenshots/16-victory-fireworks-and-match-result.png)) |
| `01:30.087` | `POST_MATCH_REVIEW_HOLD` | Giữ tổng kết 35.9s để đạt video >= 2 phút |
| `02:06.165` | `CAPTURE_STOP` | Hoàn tất ghi hình sau 126.2s |
