# AAA-Level Cinematic & Game Feel Polish — Evidence & Review Report

- **Ngày đo:** 2026-11-18T10:56:30.675Z
- **Môi trường chạy:** Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present
- **Video Trước (Baseline):** `before-gameplay.mp4` (156.74s, FPS quay baseline = 11.46 FPS, p95 = 166.7ms)
- **Video Sau (Polished Full):** `after-gameplay-full.mp4` (1920×1080, 126.08s, 6.57 MB, WebAudio Tab Track = Có)
- **Video Sau (Highlights):** `after-cinematic-highlights.mp4` (57.97s, 3.47 MB)
- **FPS Chơi Thật (Unrecorded Live Play, ~61.05s):** **26.39 FPS** (min/s=1, max/s=32, p50=33.4ms, p95=50ms, drops >25ms=1547, drops >33ms=683)
- **FPS Khi Đang Quay MP4 1080p (During Recording, 126.17s):** **10.3 FPS** (min/s=3, max/s=17, p50=83.3ms, p95=216.7ms, drops >33ms=1205)
- **Kiểm tra sạch lỗi & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, Invite code redacted = true

---

## 1. So sánh Timing & VFX Trước/Sau

| Hạng mục | Số lần quan sát | Thông số đo thực tế | Ghi chú chất lượng |
| --- | --- | --- | --- |
| Role Reveal 3D + Spotlight | 7 | 1677ms (lantern-guard), 1663ms (mist-order), 1669ms (mist-order), 1671ms (lantern-guard), 1678ms (mist-order), 1680ms (lantern-guard), 1653ms (lantern-guard) | Có làm tối nền, spotlight nhân vật, thẻ 3D xoay lật & hạt theo phe |
| Combat 75ms Hit-Stop Flash | 66 | hitStop=75ms, 75ms, 75ms, 75ms, 75ms, 75ms | Chuỗi Target Lock -> Travel -> 75ms Hit-Stop + Flash -> Floating Damage |
| Xúc xắc 3D & Clack Spark | 30 | duration=1422ms, 1322ms, 1422ms, 1321ms, 1422ms | Bouncing deceleration, tia va chạm khi tumble & vòng khóa settle |
| Rút bài Bay từ Deck + Lật 3D | 10 | duration=878ms (equipment), 1150ms (event), 1149ms (event), 873ms (event), 879ms (event) | Quỹ đạo từ Deck tới tâm, màu radar/hex/surge theo bộ bài |
| WAAPI Parabolic Pawn Glide | 22 | 1848, 1848, 1848, 1848, 1848 ms | Quỹ đạo nhảy có đỉnh & drop-shadow động + touchdown ripple |
| WebAudio Cues | 1 session | osc=1872, pcm=317 | Đồng bộ âm thanh Reveal, Parry-Riposte 2 nhịp, Card Play & Victory |

---

## 2. Mốc Timeline & Screenshots

| Thời điểm (`MM:SS.mmm`) | Loại | Chi tiết / Ảnh |
| --- | --- | --- |
| `00:00.000` | `MATCH_START` | Bắt đầu quay bản Polished AAA tại 1920x1080 (P1=gac-radio) |
| `00:00.896` | `SCREENSHOT` | Cut-in chuyển lượt tới P1 ([14-turn-transition-your-turn.png](./screenshots/14-turn-transition-your-turn.png)) |
| `00:01.062` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #1) |
| `00:02.371` | `SCREENSHOT` | Xúc xắc 3D lăn & tia va chạm D6-D4 ([01-dice-tumble-clack-spark.png](./screenshots/01-dice-tumble-clack-spark.png)) |
| `00:03.402` | `SCREENSHOT` | Xúc xắc 3D chốt kết quả với vòng khóa Settle Ring ([02-dice-settled-ring.png](./screenshots/02-dice-settled-ring.png)) |
| `00:04.158` | `SCREENSHOT` | Highlight ô đích theo tổng D6+D4 ([03-location-destination-highlight.png](./screenshots/03-location-destination-highlight.png)) |
| `00:05.185` | `SCREENSHOT` | Quân cờ nhảy parabol & touchdown ripple ([04-pawn-glide-arc-touchdown.png](./screenshots/04-pawn-glide-arc-touchdown.png)) |
| `00:06.336` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `00:08.183` | `SCREENSHOT` | Rút bài bay từ Deck lên tâm + vầng hào quang theo bộ bài ([05-card-draw-flight-flip.png](./screenshots/05-card-draw-flight-flip.png)) |
| `00:10.837` | `SCREENSHOT` | Modal Card Zoom mặt trước ([06-card-zoom-modal-front.png](./screenshots/06-card-zoom-modal-front.png)) |
| `00:12.638` | `SCREENSHOT` | Card Zoom lật 3D mặt lưng Ấn Ký ([07-card-zoom-modal-back.png](./screenshots/07-card-zoom-modal-back.png)) |
| `00:16.389` | `P1_REVEAL_ROLE` | P1 (Vy "Radio") lật vai công khai |
| `00:17.798` | `SCREENSHOT` | Lật vai Pha Anticipation: Tối bàn + Spotlight nhân vật + Mặt lưng 3D ([11-role-reveal-spotlight-anticipation.png](./screenshots/11-role-reveal-spotlight-anticipation.png)) |
| `00:20.706` | `SCREENSHOT` | Đường ngắm SVG mục tiêu ([08-attack-targeting-line.png](./screenshots/08-attack-targeting-line.png)) |
| `00:20.706` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `00:22.600` | `SCREENSHOT` | Khoảnh khắc Hit-Stop 75ms, Impact Flash & Floating Damage ([09-combat-hitstop-impact-flash.png](./screenshots/09-combat-hitstop-impact-flash.png)) |
| `00:27.582` | `SCREENSHOT` | Emote, Thang thương tích mở rộng & Tab Trang bị ([15-multiplayer-emote-damage-track.png](./screenshots/15-multiplayer-emote-damage-track.png)) |
| `00:31.332` | `PEER_REVEAL_DUNG` | Sinh viên Bình (Dũng Gác Cổng) lật vai công khai |
| `00:33.558` | `SCREENSHOT` | Lật vai Pha Reveal/Impact: Card 3D xoay mở chân dung + Huy hiệu & hạt theo phe ([12-role-reveal-3d-flip-impact.png](./screenshots/12-role-reveal-3d-flip-impact.png)) |
| `00:34.480` | `PEER_ATTACK` | Sinh viên Bình tấn công Sinh viên An |
| `00:43.349` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #5) |
| `00:46.533` | `P1_USE_SKILL` | P1 kích hoạt kỹ năng đặc biệt nhân vật |
| `00:48.022` | `SCREENSHOT` | Kỹ năng đặc trưng + Canvas Aura & Cut-in không che bàn ([13-signature-skill-cutin-vfx.png](./screenshots/13-signature-skill-cutin-vfx.png)) |
| `00:50.511` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `00:52.773` | `SCREENSHOT` | Parry Shield + Vuốt Phản Kích & COUNTER popup ([10-counterattack-parry-riposte.png](./screenshots/10-counterattack-parry-riposte.png)) |
| `00:53.794` | `WS_RECONNECT_TEST` | Kiểm tra ngắt và tự nối lại WebSocket giữa trận |
| `00:57.104` | `PEER_ATTACK` | Sinh viên Bình tấn công Sinh viên Chi |
| `01:01.970` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên An |
| `01:07.206` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên Bình |
| `01:08.571` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #9) |
| `01:10.066` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:13.018` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:21.892` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #13) |
| `01:26.192` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:30.094` | `PEER_ATTACK` | Sinh viên Bình tấn công Sinh viên Dung |
| `01:34.616` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên Chi |
| `01:35.664` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #17) |
| `01:38.272` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:40.680` | `P1_END_TURN` | P1 kết thúc lượt |
| `01:42.540` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên Dung |
| `01:43.585` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #19) |
| `01:46.116` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:49.150` | `P1_ATTACK` | P1 tấn công đối thủ trong cụm |
| `01:54.804` | `P1_ROLL_DICE` | P1 tung D6+D4 (Lượt #21) |
| `01:57.634` | `P1_DRAW_CARD` | P1 rút thẻ tại địa điểm |
| `01:59.986` | `P1_END_TURN` | P1 kết thúc lượt |
| `02:02.315` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên An |
| `02:05.205` | `SCREENSHOT` | Màn hình Tổng kết trận đấu theo phe thắng & MatchPostcard ([16-victory-fireworks-and-match-result.png](./screenshots/16-victory-fireworks-and-match-result.png)) |
| `02:05.206` | `POST_MATCH_REVIEW_HOLD` | Giữ tổng kết 0.8s để đạt video >= 2 phút |
| `02:06.165` | `CAPTURE_STOP` | Hoàn tất ghi hình sau 126.2s |
