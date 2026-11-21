# Bóng Đêm KTX — Phase 6C Art Direction, Portrait QA & Visual Integration Report

> **Milestone:** Phase 6C — Hoàn thiện 10 Chân dung Wave 5 (`starter-forty-eight` · Tier-3 Completion), nâng tổng số chân dung Full-Art 2:3 lên **58/58 nhân vật chơi được** (`10 Classic + 8 Starter Eight + 8 Wave 2 + 10 Wave 3 + 12 Wave 4 + 10 Wave 5`) và tổng thư viện nghệ thuật Midnight lên **105 WebP assets** (`58` chân dung + `40` loại thẻ + `6` địa điểm KTX + `1` mặt lưng).  
> **Phong cách:** `HUSTVerse Midnight — Cinematic Anime Noir` (đồng bộ tuyệt đối với Art Bible [`phase-2.5/character-art-bible.md`](../phase-2.5/character-art-bible.md)).  
> **Production Safety:** Không thay đổi gameplay, HP, RNG hay mở khóa ruleset mở rộng trên production (`classic` only).

---

## 1. Bảng Kiểm định 10 Chân dung Wave 5 (`1024×1536` WebP)

Toàn bộ 10 chân dung được sinh mới hoàn toàn bằng công cụ `image-generator` tích hợp, kiểm định thủ công trực tiếp bằng mắt (phong cách Anime Noir, không chữ/số/watermark/viền bài, giải phẫu bàn tay sạch, bố cục hai nhân vật April & Skipps chắc chắn trên tay vịn cầu thang, không cắt đầu, khoảng tối đáy ~28% sạch cho UI plaque) trước khi đóng gói và xử lý qua [`scripts/process-phase6c-portraits.py`](../../../scripts/process-phase6c-portraits.py) tại chất lượng WebP `q=84` (`method=6`). **Cả 10/10 file đều nằm trong khoảng `64.0 KB – 130.6 KB`** (thấp hơn rõ rệt so với ngưỡng ưu tiên `< 200 KB` và trần `< 500 KB`).

| # | Role ID | Nhân vật | Phe | File Asset | Kích thước | Dung lượng | SHA-256 (12 ký tự đầu) | Trạng thái QA |
|---|---|---|---|---|---|---:|---|---|
| 1 | `exp2_gideon` | Gideon | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-gideon.webp` | `1024×1536` (`2:3`) | `89.3 KB` | `ff3479e0bd9f` | APPROVED |
| 2 | `exp1_anathema` | Anathema | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-anathema.webp` | `1024×1536` (`2:3`) | `64.0 KB` | `b9a6b8c98608` | APPROVED |
| 3 | `exp1_bethany` | Bethany | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-bethany.webp` | `1024×1536` (`2:3`) | `127.1 KB` | `3665e9266407` | APPROVED |
| 4 | `exp1_arnold` | Arnold | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-arnold.webp` | `1024×1536` (`2:3`) | `130.6 KB` | `dbde4c81bfa4` | APPROVED |
| 5 | `exp1_cassie` | Cassie | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-cassie.webp` | `1024×1536` (`2:3`) | `75.4 KB` | `7d0c73fe6ee6` | APPROVED |
| 6 | `exp1_clairvoyant` | Clairvoyant | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-clairvoyant.webp` | `1024×1536` (`2:3`) | `69.8 KB` | `d3be62c23cc4` | APPROVED |
| 7 | `exp2_april_skipps` | April & Skipps | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-april-skipps.webp` | `1024×1536` (`2:3`) | `72.6 KB` | `58fbee149429` | APPROVED |
| 8 | `exp2_colt` | Colt | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-colt.webp` | `1024×1536` (`2:3`) | `118.9 KB` | `3a9f0dbc6e75` | APPROVED |
| 9 | `exp2_diana` | Diana | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-diana.webp` | `1024×1536` (`2:3`) | `91.9 KB` | `09ea0659a59b` | APPROVED |
| 10 | `exp2_aaron` | Aaron | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-aaron.webp` | `1024×1536` (`2:3`) | `72.8 KB` | `f9db101d5fd1` | APPROVED |

- **Tổng dung lượng 10 ảnh Wave 5:** `912.4 KB` (`934,358 bytes`; trung bình `91.2 KB/ảnh`).
- **Contact Sheet Wave 5 (1 Hunter + 9 Neutral):** [`character-contact-sheet.webp`](./character-contact-sheet.webp) & [`character-contact-sheet.png`](./character-contact-sheet.png).
- **Manifest đầy đủ kèm SHA-256:** [`asset-manifest.json`](./asset-manifest.json).
- **Chống trùng lặp:** Toàn bộ **58/58** chân dung (`10 Classic + 8 Starter Eight + 8 Wave 2 + 10 Wave 3 + 12 Wave 4 + 10 Wave 5`) đều có **58 mã SHA-256 hoàn toàn khác biệt**.

---

## 2. Tích hợp UI, Cinematics & Bảo mật P0

1. **`features/boardgame/ui/midnight-noir-tokens.ts`:**
   - Khôi phục kiểu chặt `Readonly<Record<BoardGameRoleId, string>>` trên `MIDNIGHT_CHARACTER_ART` cho đủ **58/58** vai trò (compile-time guarantee không thiếu chân dung).
   - Xuất danh sách `WAVE5_ROLE_IDS: readonly Phase6RoleId[]` (10 vai Wave 5) dùng chung cho Prototype Lab & Unit Tests.
2. **`features/boardgame/ui/BoardGameVisualPrototypeView.tsx`:**
   - Bổ sung **Phần 5F (`data-testid="proto-section-wave5"`)** cho 10 tướng Wave 5 (`1 Hunter · 9 Neutral`), 3 tab lọc phe (`Tất cả 10 / Đội Săn Đêm 1 / Kẻ Độc Hành 9`), chế độ bảo mật P0, lật 3D và Zoom Modal.
   - Cập nhật tổng thư viện ảnh Midnight tại Phần 4 lên **105 artwork AI WebP tối ưu**.
3. **Bảo mật P0 & Cinematic VFX:**
   - `resolveRoleCardPresentation` chặn hoàn toàn `portraitSrc`, `roleName`, `faction`, `maxHp` khỏi DOM khi chưa lật với người chơi khác hoặc khán giả.
   - `VisualEventTracker` & `extractVisualEventsFromDiff` kiểm chứng đủ 10 vai Wave 5 cho `OPENING_DEAL` (cách ly Spectator), `ROLE_REVEAL` và `reducedMotion`.

---

## 3. Kiểm chứng Tự động & Playwright Visual QA

- **Unit Test (`test/boardgame-phase6c-portraits.test.cjs`):** 5/5 PASS (xác thực 10 file WebP `1024×1536`, `< 200 KB`, 58/58 SHA-256 duy nhất, đồng bộ byte-for-byte với `asset-manifest.json`, ma trận bảo mật P0, VFX + Reduced Motion, và khóa production `classic`-only).
- **Playwright Visual QA (`scripts/verify-phase6c-visuals.cjs` & `test/boardgame-visual-prototype.cjs`):**
  - Desktop `1440×900` & Mobile `390×844`: 10/10 ảnh Wave 5 tải đủ `naturalWidth === 1024`, `naturalHeight === 1536`, đúng tỷ lệ `2:3`, `0px` horizontal overflow, `0` console/HTTP errors.
  - 3 tab lọc phe (`10 / 1 / 9`), P0 secrecy toggle xóa sạch `role-exp*.webp` khỏi DOM khi ẩn, Zoom Modal + lật 2 mặt qua Hunter & Neutral (`Gideon`, `Anathema`, `April & Skipps`, `Colt`), graceful `onError` fallback (`RolePortraitSvg`) khi giả lập lỗi tải `role-exp1-arnold.webp`, và Reduced Motion PASS.
