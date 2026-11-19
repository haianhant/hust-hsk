# Phase 3 — Top-Tier Combat Impact V2 — Evidence & Review Notes

- **Ngày đo:** 2026-11-19T07:57:44.129Z
- **Môi trường:** Linux container CPU rasterizer (--use-gl=angle --use-angle=swiftshader) — no hardware GPU present
- **An toàn & bảo mật:** Console errors = 0, Page errors = 0, MSSV leaks = 0, F5 non-replay verified = true

## 1. So sánh Before / After

| Tiêu chí | Before (`before-combat-*.mp4`) | After (`after-combat-*.mp4`) |
| --- | --- | --- |
| Chuỗi 5 pha Combat (`750–1100ms`) | Chỉ 4 nhịp rời (`580–780ms`), không có pha Anticipation | Đủ 5 pha liên hoàn `Target Lock (0–150ms) → Anticipation (150–300ms) → Attack Travel (300–500ms) → Impact (500–700ms) → Recovery (700–1100ms)` |
| Chuyển động vật lý quân cờ (lunge / knockback 6–10px / dodge) | `0px` (quân đứng yên) | Đã ghi nhận dịch chuyển vật lý tối đa `10px` (103 mẫu WAAPI active) |
| Thời điểm xuất hiện sát thương vs Impact | Popup phản kích bật cùng đòn đầu | Kiểm chứng **7 cặp** popup đều xuất hiện **tại/sau Impact** (0 trường hợp hiện sớm) |
| Phân biệt biến thể Combat | Đổi màu cơ bản, thiếu Critical riêng | Phân biệt rõ hình dạng, chuyển động quân, Canvas 2D & SFX đồng bộ frame cho Attack, Critical, Counterattack, Miss (né ngang), Shield (khiên lục giác không giật lùi), Healing (xoắn ốc + nâng nhẹ) & Signature Skill |
| Video trận thật 1920×1080 MP4 | [`before-combat-live.mp4`](./before-combat-live.mp4) (10.34s) | [`after-combat-live.mp4`](./after-combat-live.mp4) (14.18s, 0.74 MB) |
| Video biến thể 1920×1080 MP4 | [`before-combat-variants.mp4`](./before-combat-variants.mp4) (20.66s) | [`after-combat-variants.mp4`](./after-combat-variants.mp4) (23.6s, 0.51 MB) |
| FPS khi đang quay 1080p MP4 (SwiftShader) | Live 8.18 FPS / Variants 3.57 FPS | Live 6.52 FPS (p95=366.7ms) / Variants 3.2 FPS (p95=666.7ms) |

## 2. Ảnh chụp 5 giai đoạn & đầy đủ biến thể Combat

- **Before:** [`before-01-live-attack.png`](./screenshots/before-01-live-attack.png), [`before-02-attack-variant.png`](./screenshots/before-02-attack-variant.png), [`before-03-counter-variant.png`](./screenshots/before-03-counter-variant.png), [`before-04-shield-barrage.png`](./screenshots/before-04-shield-barrage.png), [`before-05-skill-lightning.png`](./screenshots/before-05-skill-lightning.png)
- **Stage 1 — Target Lock (0–150ms):** [`after-01-stage1-target-lock.png`](./screenshots/after-01-stage1-target-lock.png)
- **Stage 2 — Anticipation (150–300ms):** [`after-02-stage2-anticipation.png`](./screenshots/after-02-stage2-anticipation.png)
- **Stage 3 — Attack Travel (300–500ms):** [`after-03-stage3-travel.png`](./screenshots/after-03-stage3-travel.png)
- **Stage 4 — Impact + Hit-Stop (500–700ms):** [`after-04-stage4-impact-hitstop.png`](./screenshots/after-04-stage4-impact-hitstop.png)
- **Stage 5 — Recovery + Floating Damage (700–1100ms):** [`after-05-stage5-recovery-damage.png`](./screenshots/after-05-stage5-recovery-damage.png)
- **Counterattack (Parry → Reversal → Riposte):** [`after-06-counterattack.png`](./screenshots/after-06-counterattack.png)
- **Miss (Né ngang + whiff):** [`after-07-miss-dodge.png`](./screenshots/after-07-miss-dodge.png)
- **Shield BLOCK (Khiên lục giác):** [`after-08-shield-block.png`](./screenshots/after-08-shield-block.png)
- **Healing Aura (Xoắn ốc lục bảo + dấu cộng):** [`after-09-healing-aura.png`](./screenshots/after-09-healing-aura.png)
- **Critical Hit (`CRIT -5`):** [`after-10-critical-hit.png`](./screenshots/after-10-critical-hit.png)
- **Signature Skill (Vy Radio Sét Cao Áp):** [`after-11-skill-lightning.png`](./screenshots/after-11-skill-lightning.png)
- **Trận Multiplayer Thật 4 người:** [`after-12-live-multiplayer-combat.png`](./screenshots/after-12-live-multiplayer-combat.png)