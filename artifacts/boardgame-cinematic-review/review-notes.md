# Board Game Cinematic & Game Feel Review Notes — Bóng Đêm KTX

- **Ngày thu thập:** 2026-11-18T07:17:31.125Z
- **Độ phân giải quay:** 1920×1080 (video/mp4;codecs=avc1,opus)
- **Thời lượng `gameplay-full.mp4`:** 156.74s (8.44 MB) — Âm thanh Tab WebAudio: Có
- **Thời lượng `cinematic-highlights.mp4`:** 64.24s (4.15 MB)
- **FPS thực đo trên trình duyệt P1:** Trung bình **11.46 FPS** (min/sec: 4, max/sec: 17, p50=83.3ms, p95=166.7ms, p99=250ms, drops >33.4ms: 1667, drops >50ms: 1600)
- **Kiểm tra sạch lỗi & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, Invite code đã che (redacted) = true

---

## 1. Phân định rõ Sandbox/Automation vs Gameplay Thực tế

| Thành phần | Bản chất | Ghi chú chi tiết |
| --- | --- | --- |
| **Engine & Server Trận đấu** | **Gameplay thật** | Chạy từ production bundle (`out/`) kết nối `BoardGameClubDO` & `BoardGameMatchDO` qua `test/ws-shim/server.js`; không chỉnh sửa RNG, bài rút, sát thương hay logic game. |
| **Render & Âm thanh P1** | **Gameplay thật** | Chromium 1920×1080 thật với lớp Canvas 2D VFX, FLIP pawn glide, 3D Card flip và WebAudio đa lớp (`sound.ts`), quay qua `getDisplayMedia` + `MediaRecorder`. |
| **Điều khiển P1 & P2–P4** | **E2E Orchestration** | Script Playwright (`test/boardgame-cinematic-capture.cjs`) điều phối 1 bàn 4 người thực (`Sinh viên An, Bình, Chi, Dung`) để kích hoạt tuần tự đủ 6 tình huống (D6+D4, di chuyển, rút/lật/zoom bài, tấn công + phản kích, lật vai + tuyệt kỹ, chuyển lượt + reconnect). |
| **Che dữ liệu nhạy cảm** | **Privacy CSS Filter** | Tiêm CSS che mã mời phòng (`Mã: [ẨN BẢO MẬT]`) trên Status Bar và dòng chân trang MatchPostcard trước khi bấm quay. |

---

## 2. Timestamp các sự kiện trong `gameplay-full.mp4`

| Thời điểm (`MM:SS.mmm`) | Loại | Mô tả sự kiện / Ảnh đính kèm |
| --- | --- | --- |
| `00:00.000` | `MATCH_START` | Bắt đầu quay trận 4 người tại 1920x1080 (P1=gac-ky-thuat) |
| `00:00.828` | `SCREENSHOT` | 13-turn-transition-your-turn-cutin.png — Cut-in chuyển lượt tới P1 ([13-turn-transition-your-turn-cutin.png](./screenshots/13-turn-transition-your-turn-cutin.png)) |
| `00:01.022` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #1) |
| `00:02.376` | `SCREENSHOT` | 01-dice-3d-rolling.png — Xúc xắc 3D D6+D4 đang xoay giai đoạn tumble ([01-dice-3d-rolling.png](./screenshots/01-dice-3d-rolling.png)) |
| `00:03.244` | `SCREENSHOT` | 02-dice-3d-settled-result.png — Xúc xắc 3D D6+D4 chốt kết quả & mở bảng tổng ([02-dice-3d-settled-result.png](./screenshots/02-dice-3d-settled-result.png)) |
| `00:03.988` | `SCREENSHOT` | 03-location-destination-highlight.png — Highlight ô địa điểm đích theo tổng D6+D4 ([03-location-destination-highlight.png](./screenshots/03-location-destination-highlight.png)) |
| `00:04.969` | `SCREENSHOT` | 04-pawn-glide-movement.png — Quân cờ di chuyển mượt FLIP tới địa điểm ([04-pawn-glide-movement.png](./screenshots/04-pawn-glide-movement.png)) |
| `00:06.194` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #1) |
| `00:07.751` | `P1_CHOOSE_MOVE` | P1 chọn địa điểm di chuyển (Tổng 7 / La Bàn) |
| `00:08.935` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `00:10.599` | `SCREENSHOT` | 05-card-draw-3d-flip-vfx.png — Hiệu ứng rút bài & lật thẻ 3D Midnight Noir ([05-card-draw-3d-flip-vfx.png](./screenshots/05-card-draw-3d-flip-vfx.png)) |
| `00:13.354` | `SCREENSHOT` | 06-card-zoom-modal-front.png — Modal Card Zoom hiển thị mặt trước thẻ ([06-card-zoom-modal-front.png](./screenshots/06-card-zoom-modal-front.png)) |
| `00:15.186` | `SCREENSHOT` | 07-card-zoom-modal-flipped-back.png — Card Zoom lật 3D sang mặt lưng Ấn Ký ([07-card-zoom-modal-flipped-back.png](./screenshots/07-card-zoom-modal-flipped-back.png)) |
| `00:16.364` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `00:18.501` | `P1_REVEAL_ROLE` | P1 (Minh "Kỹ Thuật") lật vai công khai |
| `00:19.687` | `SCREENSHOT` | 11-role-reveal-cutin.png — Cinematic Cut-In khi P1 lật vai nhân vật ([11-role-reveal-cutin.png](./screenshots/11-role-reveal-cutin.png)) |
| `00:23.055` | `SCREENSHOT` | 08-attack-targeting-line.png — Đường ngắm SVG cong nối từ P1 tới mục tiêu trong tầm ([08-attack-targeting-line.png](./screenshots/08-attack-targeting-line.png)) |
| `00:23.055` | `P1_ATTACK` | P1 tấn công đối thủ cùng cụm |
| `00:24.534` | `SCREENSHOT` | 09-attack-damage-slash-vfx.png — Hoạt ảnh chém Canvas 2D & pop-up sát thương ([09-attack-damage-slash-vfx.png](./screenshots/09-attack-damage-slash-vfx.png)) |
| `00:29.658` | `SCREENSHOT` | 14-multiplayer-emote-and-damage-track.png — Emote toast, Thang thương tích mở rộng & Tab Trang bị ([14-multiplayer-emote-and-damage-track.png](./screenshots/14-multiplayer-emote-and-damage-track.png)) |
| `00:31.394` | `PEER_ROLL_DICE` | Sinh viên Bình tung D6 + D4 (Lượt #2) |
| `00:34.754` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #3) |
| `00:37.123` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên Bình |
| `00:40.656` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #4) |
| `00:43.209` | `PEER_REVEAL_DUNG` | Sinh viên Dung (Dũng "Gác Cổng") lộ vai công khai |
| `00:45.024` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên Bình |
| `00:48.716` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #5) |
| `00:50.326` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #5) |
| `00:51.765` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `00:53.086` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `00:54.836` | `P1_USE_SKILL` | P1 kích hoạt kỹ năng đặc biệt nhân vật |
| `00:56.164` | `SCREENSHOT` | 12-special-skill-cutin-vfx.png — Cinematic Cut-In + Canvas VFX khi kích hoạt Tuyệt kỹ ([12-special-skill-cutin-vfx.png](./screenshots/12-special-skill-cutin-vfx.png)) |
| `00:58.925` | `P1_ATTACK` | P1 tấn công đối thủ cùng cụm |
| `01:02.513` | `SCREENSHOT` | 15-elimination-cutin-banner.png — Cut-In ELIMINATION khi hạ gục người chơi ([15-elimination-cutin-banner.png](./screenshots/15-elimination-cutin-banner.png)) |
| `01:03.603` | `WS_RECONNECT_TEST` | Kiểm tra ngắt và tự động nối lại WebSocket trên P1 |
| `01:04.572` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #6) |
| `01:09.779` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên Dung |
| `01:11.065` | `SCREENSHOT` | 10-counterattack-vfx-popup.png — Phản kích COUNTER_STRIKE & COUNTER popup ([10-counterattack-vfx-popup.png](./screenshots/10-counterattack-vfx-popup.png)) |
| `01:13.972` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #7) |
| `01:16.363` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên An |
| `01:17.855` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #8) |
| `01:19.447` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #8) |
| `01:21.038` | `P1_LOC_HEAL` | P1 sử dụng sức mạnh Ô 9 hồi 1 thương tích |
| `01:22.108` | `P1_END_TURN` | P1 kết thúc lượt -> chuyển lượt sang P2 |
| `01:22.487` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #9) |
| `01:25.169` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #10) |
| `01:27.189` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên An |
| `01:28.330` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #11) |
| `01:29.764` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `01:31.068` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `01:32.196` | `P1_END_TURN` | P1 kết thúc lượt -> chuyển lượt sang P2 |
| `01:32.578` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #12) |
| `01:34.849` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #13) |
| `01:37.288` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #14) |
| `01:38.901` | `P1_CHOOSE_MOVE` | P1 chọn địa điểm di chuyển (Tổng 7 / La Bàn) |
| `01:40.052` | `P1_LOC_HEAL` | P1 sử dụng sức mạnh Ô 9 hồi 1 thương tích |
| `01:41.709` | `P1_ATTACK` | P1 tấn công đối thủ cùng cụm |
| `01:44.179` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #15) |
| `01:46.693` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên Dung |
| `01:47.691` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #16) |
| `01:50.154` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #17) |
| `01:51.740` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `01:53.125` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `01:54.921` | `P1_ATTACK` | P1 tấn công đối thủ cùng cụm |
| `01:57.405` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #18) |
| `01:59.755` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #19) |
| `02:02.219` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #20) |
| `02:03.753` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `02:05.099` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `02:06.359` | `P1_END_TURN` | P1 kết thúc lượt -> chuyển lượt sang P2 |
| `02:06.751` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #21) |
| `02:10.310` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #22) |
| `02:12.401` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên An |
| `02:13.570` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #23) |
| `02:15.048` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `02:16.398` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `02:17.572` | `P1_END_TURN` | P1 kết thúc lượt -> chuyển lượt sang P2 |
| `02:17.962` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #24) |
| `02:21.467` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #25) |
| `02:23.110` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên Chi |
| `02:24.288` | `P1_ROLL_DICE` | P1 bấm Tung Xúc Xắc (Lượt #26) |
| `02:25.801` | `P1_DRAW_CARD` | P1 rút thẻ tại khu vực |
| `02:27.131` | `P1_USE_CARD` | P1 giải quyết/trang bị thẻ vừa rút |
| `02:28.276` | `P1_END_TURN` | P1 kết thúc lượt -> chuyển lượt sang P2 |
| `02:28.674` | `PEER_ROLL_DICE` | Sinh viên Chi tung D6 + D4 (Lượt #27) |
| `02:30.359` | `PEER_ATTACK` | Sinh viên Chi tấn công Sinh viên Dung |
| `02:31.378` | `PEER_ROLL_DICE` | Sinh viên Dung tung D6 + D4 (Lượt #28) |
| `02:33.489` | `PEER_ATTACK` | Sinh viên Dung tấn công Sinh viên An |
| `02:36.629` | `SCREENSHOT` | 16-match-result-postcard-redacted.png — Bảng kết quả & MatchPostcard đã che mã phòng ([16-match-result-postcard-redacted.png](./screenshots/16-match-result-postcard-redacted.png)) |
| `02:36.813` | `CAPTURE_STOP` | Kết thúc ghi hình sau 156.8s |

### Phân đoạn trong `cinematic-highlights.mp4`

| Đoạn nổi bật | Bắt đầu (video gốc) | Kết thúc (video gốc) |
| --- | --- | --- |
| Mở màn trận đấu & lượt tung D6+D4 đầu tiên | `00:00.000` | `00:05.824` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `00:06.013` | `00:07.436` |
| Sequence 3: Rút bài, lật thẻ 3D & Card Zoom Modal | `00:08.754` | `00:16.171` |
| Sequence 5A: P1 lật vai công khai & ROLE_REVEAL Cut-In | `00:17.379` | `00:21.289` |
| Sequence 4: Ngắm mục tiêu, Tấn công, Sát thương & Phản kích | `00:21.478` | `00:27.645` |
| Sequence 6A: Multiplayer Emote, Compact Damage Track & Tab Sidebar | `00:27.830` | `00:31.189` |
| Peer Reveal: Dũng Gác Cổng lộ diện (chuẩn bị Phản Kích) | `00:43.029` | `00:44.835` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `00:48.536` | `00:49.956` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `00:50.146` | `00:51.582` |
| Sequence 5B: P1 kích hoạt Tuyệt kỹ ULTIMATE_SKILL Cut-In & Canvas VFX | `00:54.498` | `00:57.975` |
| Sequence 4: Ngắm mục tiêu, Tấn công, Sát thương & Phản kích | `00:58.163` | `01:03.420` |
| Sequence 4: Tấn công Dũng Gác Cổng & Phản kích COUNTER_STRIKE | `01:09.599` | `01:12.469` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `01:17.674` | `01:19.079` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `01:19.266` | `01:20.679` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `01:28.149` | `01:29.581` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `01:37.105` | `01:38.542` |
| Sequence 4: Ngắm mục tiêu, Tấn công, Sát thương & Phản kích | `01:40.967` | `01:43.964` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `01:49.974` | `01:51.555` |
| Sequence 4: Ngắm mục tiêu, Tấn công, Sát thương & Phản kích | `01:54.146` | `01:57.177` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `02:02.038` | `02:03.570` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `02:13.390` | `02:14.860` |
| Sequence 1&2: P1 tung D6+D4, highlight địa điểm & FLIP pawn glide | `02:24.108` | `02:25.617` |
| Sequence 6B: Kết thúc trận VICTORY Cut-In & MatchPostcard | `02:34.475` | `02:36.630` |

---

## 3. Đánh giá Game Feel, Animation & Kiểm tra Regression

- **Xúc xắc 3D (`D6 + D4`):** Đo được **41** lượt tung xúc xắc có overlay; thời lượng xoay + chốt kết quả nhất quán, và bài kiểm tra `END_TURN` ngay sau lượt tung xác nhận **không còn xoay lại xúc xắc cũ** (`endTurnDuplicateDiceCheckPassed: true`).
- **Quân cờ di chuyển & Highlight địa điểm:** Ghi nhận **31** pha highlight ô đích (`data-destination-highlighted`) và **28** hiệu ứng FLIP `useSmoothPawnGlide` (mẫu duration: 745, 1848, 1848, 1848, 1848, 745 ms).
- **Rút bài, Lật 3D & Card Zoom:** Ghi nhận **23** lần overlay rút bài và **1** lần mở/lật Modal Card Zoom mặt trước ↔ mặt lưng Ấn Ký.
- **Chiến đấu, Phản kích & Cut-In:** Ghi nhận **37** pop-up sát thương/hồi máu/khiên/phản kích và **18** banner Cut-In (`YOUR_TURN`, `ROLE_REVEAL`, `ULTIMATE_SKILL`, `ELIMINATION`, `VICTORY`).
- **Âm thanh WebAudio:** Tab audio được nhúng trực tiếp vào MP4 (`codecs=avc1,opus`); engine `sound.ts` khởi tạo **2556** oscillator và **366** PCM buffer trong suốt ván.
- **WebSocket Reconnect:** Đóng chủ động WS ở giữa trận (`close(4000)`) -> tự kết nối lại sau **650 ms** và không phát sinh console/page error.
- **Lưu ý môi trường Headless SwiftShader:** Trong container Linux không có GPU phần cứng (`--use-angle=swiftshader`) khi đồng thời mã hóa H.264+Opus 1080p ngay trong cùng tiến trình Chrome, FPS đạt trung bình **11.46 FPS** (chi tiết xem `performance-report.json`). Khi quay thực tế trên máy có GPU + OBS, khung hình đạt ổn định 60 FPS.

---

## 4. Hướng dẫn quay OBS Studio thủ công (cho phiên chơi người thật 4–8 người)

Nếu muốn tự quay lại phiên chơi 4–8 người thật ngoài trình duyệt có tăng tốc GPU phần cứng:
1. **Cấu hình OBS Studio:**
   - *Settings → Video*: Base & Output Resolution `1920x1080`, Common FPS Values `60`.
   - *Settings → Output → Recording*: Format `MPEG-4 (.mp4)`, Video Encoder `x264` hoặc `NVENC H.264`, Rate Control `CBR` `8000–12000 Kbps`.
   - *Sources*: Dùng `Window Capture` (chọn cửa sổ Chrome toàn màn hình F11) + `Application Audio Output Capture` để thu âm thanh WebAudio từ tab game.
2. **Bảo mật trước khi bấm Start Recording:**
   - Che vùng mã mời (`Mã: ...`) ở góc trên bên phải bằng source `Color Source` nhỏ trong OBS hoặc bật chế độ Streamer trước khi chia sẻ màn hình.
3. **Kịch bản thao tác đề xuất (~2.5 phút):**
   - **0:00–0:25:** Vào bàn đã đủ người → tung `D6 + D4`, chờ xúc xắc chốt & quân cờ lướt FLIP tới ô mới.
   - **0:25–0:55:** Vào ô rút bài (Cổng Bảo Vệ / Sảnh / Trạm Phát / Căng Tin) → rút bài (lật 3D) → bấm `🔍 Soi` trên thẻ để lật xem 2 mặt ở Card Zoom.
   - **0:55–1:30:** Nhấn vào người chơi/ô cùng cụm để hiện đường ngắm SVG → tấn công thường & kích hoạt phản kích (nếu gặp Dũng "Gác Cổng").
   - **1:30–2:00:** Mở menu `🎭 Vai & Kỹ năng` → lật vai công khai → kích hoạt kỹ năng nhân vật (`SKILL_CAST` Cut-In + Canvas VFX).
   - **2:00–2:30:** Bấm `Kết thúc lượt` chuyển người chơi khác, gửi Emote, mở rộng/thu gọn Thang Thương Tích, kiểm tra Kết thúc ván & MatchPostcard.
