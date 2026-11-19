# Phase 3.1 — Final Combat Polish & Playtest Readiness Report

- **Thời điểm đánh giá:** 2026-11-19T09:52:13.956Z
- **Độ phân giải kiểm thử:** 1920×1080 Desktop (kèm kiểm tra hồi quy E2E 4–8 người & Mobile 390×844)
- **Môi trường ghi hình:** Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present
- **Phạm vi tuân thủ:** 0 thay đổi tại `features/boardgame/domain/`, `worker/`, `shared/contracts/`; giữ nguyên Desktop Tactical Board V2, RNG và luật chơi server-authoritative.

## 1. Bảng Đánh Giá Sẵn Sàng Playtest (PASS / FAIL)

| # | Hạng mục nghiệm thu Pre-Playtest | Trạng thái | Bằng chứng đo thực tế |
| --- | --- | :---: | --- |
| 1 | Độ rõ Impact 1920×1080 (Shockwave + Hit Flash + Floating Damage) & tự ẩn đường nhắm tĩnh khi đang đánh | **PASS** | `targetingLineDuringCombatCount`: Before `26` → After **`0`**; ảnh [Stage 4 Impact](./screenshots/after-04-stage4-impact-hitstop.png) & [Stage 5 Damage](./screenshots/after-05-stage5-recovery-damage.png) |
| 2 | Chuỗi liền mạch Target Lock → Anticipation → Travel → Impact → Recovery & đồng bộ xúc xắc tấn công | **PASS** | Live `diceUnsettledDuringDamageCount`: Before `6` → After **`0`**; **8/8** cặp popup xuất hiện tại/sau Impact (0 hiện sớm) |
| 3 | Phân biệt chuyển động Normal vs Critical vs Counterattack (không chỉ đổi màu) | **PASS** | Normal lunge `+8px` / `75ms` hit-stop; Critical coil-back `-6.5px` → slam `+10px` + squash-stagger `85ms` + X-cleavage; Counter parry brace → pivot reversal → twin-blade riposte `80ms`; dịch chuyển tối đa **`10.09px`** |
| 4 | Healing (aura + nâng nhẹ + âm riêng) & Miss (né ngang + ghost whiff + 0 hit-stop/shake) | **PASS** | [Healing](./screenshots/after-10-healing-aura.png) & [Miss](./screenshots/after-08-miss-dodge.png); xác minh `hitStopMs === 0` cho toàn bộ Miss |
| 5 | Multi-target & 4–8 quân cùng ô (stagger riêng từng mục tiêu, không chồng popup/VFX) | **PASS** | `popupOverlapCount`: Before `0` → After **`0`** (tối đa `7` popup đồng thời); ảnh [8-Pawn Crowded AoE](./screenshots/after-11-crowded-multitarget.png) & [Live 8-Player](./screenshots/after-13-live-8p-crowded.png) |
| 6 | Không lệch vị trí quân cờ, không rò z-index, không phát trùng VFX | **PASS** | `maxDriftPx = 0px` (Variants), `0px` (Live 4P), `0px` (Live 8P); `leakedZIndexCount = 0`; `duplicateVfxUidCount = 0` |
| 7 | Âm thanh chuẩn hóa, chống phát trùng & đồng bộ mốc animation | **PASS** | Live audio: `251` osc / `33` PCM; Variants: `78` osc / `38` PCM; compressor `-16dB / 8:1` + dynamic ducking; cooldown gộp đa đòn xác minh qua unit test |
| 8 | Reconnect/F5, Skip Animation, Reduced Motion & High/Balanced/Low | **PASS** | `f5CombatNonReplayVerified = true`; Skip post-drift = `0px`; Reduced Motion = `true`; High/Balanced/Low = `true` |
| 9 | An toàn, Console/Page Error & Bảo mật thông tin trận thật | **PASS** | `consoleErrors = 0`, `pageErrors = 0`, `auditErrors = 0` (0 MSSV leak), invite code đã ẩn trong video |

## 2. So sánh Before (Phase 3) vs After (Phase 3.1)

| Chỉ số | Before (`4fe5af5` Phase 3) | After (Phase 3.1) |
| --- | --- | --- |
| Video trận thật 4P+Spec (1920×1080 MP4+Audio) | [`before-combat-live.mp4`](./before-combat-live.mp4) (10.79s) | [`after-combat-live.mp4`](./after-combat-live.mp4) (11.36s, 0.68 MB) |
| Video biến thể Combat (1920×1080 MP4+Audio) | [`before-combat-variants.mp4`](./before-combat-variants.mp4) (22.41s) | [`after-combat-variants.mp4`](./after-combat-variants.mp4) (27.08s, 0.61 MB) |
| Xúc xắc tấn công chưa chốt khi popup sát thương hiện (Live) | `6` frames | **`0`** frames |
| Đường nhắm SVG tĩnh che lên hiệu ứng khi đang combat | `26` frames | **`0`** frames |
| Số lần chồng khung popup sát thương đa mục tiêu | `0` | **`0`** |
| Lệch vị trí quân cờ sau khi kết thúc combat / Skip | `0px` | **`0px`** (Skip: `0px`) |
| FPS trong lúc đang ghi hình 1080p MP4 (SwiftShader CPU) | Live 7.28 FPS / Variants 4.6 FPS | Live 8.14 FPS (p95=300ms) / Variants 3.54 FPS (p95=616.6ms) |

## 3. Lỗi Còn Tồn Tại & Mức Độ Nghiêm Trọng (Trước Playtest Người Thật)

- **P0 (Blocker):** Không phát hiện lỗi P0 nào chặn playtest.
- **P1 (Major):** Không phát hiện lỗi P1 nào về đồng bộ damage-after-impact, chồng popup, phát trùng VFX hoặc lệch quân cờ.
- **P2 (Low / Giới hạn môi trường đo & khuyến nghị playtest thật):**
  1. **FPS ghi hình trên container Linux CPU SwiftShader (`3–7 FPS` khi đồng thời nén 1080p MediaRecorder):** Đây là nút thắt mã hóa phần mềm không có GPU của môi trường CI (benchmark không ghi hình trên cùng máy vẫn đạt `54–60 FPS` ở VFX Sandbox). Cần quan sát thêm cảm nhận độ mượt 60 FPS thực tế trên máy tính có GPU & trình duyệt Chrome/Edge/Safari của người chơi trong buổi playtest.
  2. **Cân bằng âm lượng chủ quan trên nhiều tai nghe/loa:** Master compressor (`-16dB / 8:1`) và dynamic voice ducking đã ngăn méo/vỡ tiếng bằng kiểm chứng kỹ thuật, nhưng vẫn nên lấy feedback người chơi thật về mức âm lượng mặc định của `playCounterStrike` vs `playGunfireBurst` so với hội thoại voice call khi chơi nhóm 4–8 người.
  3. **Trình duyệt di động iOS Safari WebAudio unlock:** WebAudio tự resume sau tương tác chạm đầu tiên của người chơi; cần kiểm tra nhanh trên thiết bị iOS thật trong phiên playtest đầu tiên.

## 4. Kết luận Sẵn Sàng Playtest

- **Đề xuất:** **READY FOR HUMAN PLAYTEST (Đạt toàn bộ cổng P0/P1 tự động & kiểm chứng video 1920×1080).**