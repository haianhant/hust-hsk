# Bóng Đêm KTX — Phase 5D Art Direction, Portrait QA & Visual Integration Report

> **Milestone:** Phase 5D — Hoàn thiện 12 Chân dung Wave 4 (`starter-thirty-eight`), nâng tổng số chân dung Full-Art 2:3 lên **48/48 nhân vật chơi được** (`10 Classic + 8 Starter Eight + 8 Wave 2 + 10 Wave 3 + 12 Wave 4`) và tổng thư viện nghệ thuật Midnight lên **95 WebP assets** (`48` chân dung + `40` loại thẻ + `6` địa điểm KTX + `1` mặt lưng).  
> **Phong cách:** `HUSTVerse Midnight — Cinematic Anime Noir` (đồng bộ tuyệt đối với Art Bible [`phase-2.5/character-art-bible.md`](../phase-2.5/character-art-bible.md)).  
> **Production Safety:** Không thay đổi gameplay, HP, RNG hay mở khóa ruleset mở rộng trên production (`classic` only).

---

## 1. Bảng Kiểm định 12 Chân dung Wave 4 (`1024×1536` WebP)

Toàn bộ 12 chân dung được sinh mới hoàn toàn bằng `image-generator`, kiểm định thủ công trực tiếp bằng mắt (chất lượng Anime Noir, không chữ/số/watermark/viền bài, giải phẫu bàn tay sạch, không cắt đầu, khoảng tối đáy 28% sạch cho UI plaque) trước khi đóng gói và xử lý qua [`scripts/process-phase5d-portraits.py`](../../../scripts/process-phase5d-portraits.py) tại chất lượng WebP `q=84` (`method=6`). **Cả 12/12 file đều nằm trong khoảng `84.6 KB – 152.4 KB`** (thấp hơn rõ rệt so với ngưỡng mục tiêu `< 200 KB` và trần `< 500 KB`).

| # | Role ID | Nhân vật | Phe | File Asset | Kích thước | Dung lượng | SHA-256 (12 ký tự đầu) | Trạng thái QA |
|---|---|---|---|---|---|---:|---|---|
| 1 | `exp2_elise` | Elise | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-elise.webp` | `1024×1536` (`2:3`) | `115.2 KB` | `69afad10a385` | APPROVED |
| 2 | `exp1_ernest` | Ernest | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp1-ernest.webp` | `1024×1536` (`2:3`) | `100.9 KB` | `287e64ef89d8` | APPROVED |
| 3 | `exp1_gwendolen` | Gwendolen | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp1-gwendolen.webp` | `1024×1536` (`2:3`) | `116.5 KB` | `a777da41e019` | APPROVED |
| 4 | `exp2_freyja` | Freyja | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-freyja.webp` | `1024×1536` (`2:3`) | `152.4 KB` | `aff67801e821` | APPROVED |
| 5 | `exp2_umibozu` | Umibozu | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-umibozu.webp` | `1024×1536` (`2:3`) | `95.5 KB` | `6f31844263c6` | APPROVED |
| 6 | `exp2_urban_legend` | Urban Legend | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-urban-legend.webp` | `1024×1536` (`2:3`) | `86.6 KB` | `5832c3483c8d` | APPROVED |
| 7 | `exp2_warlord` | Warlord | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-warlord.webp` | `1024×1536` (`2:3`) | `130.7 KB` | `0468237c7855` | APPROVED |
| 8 | `exp2_usurper` | Usurper | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-usurper.webp` | `1024×1536` (`2:3`) | `96.7 KB` | `86661999b891` | APPROVED |
| 9 | `exp2_arlene` | Arlene | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-arlene.webp` | `1024×1536` (`2:3`) | `84.6 KB` | `075f30320569` | APPROVED |
| 10 | `exp1_angel` | Angel | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-angel.webp` | `1024×1536` (`2:3`) | `112.4 KB` | `9dea9527d827` | APPROVED |
| 11 | `exp2_bianca` | Bianca | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-bianca.webp` | `1024×1536` (`2:3`) | `116.9 KB` | `052bc797d449` | APPROVED |
| 12 | `exp2_dalton` | Dalton | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-dalton.webp` | `1024×1536` (`2:3`) | `120.0 KB` | `d69323b9d0b2` | APPROVED |

- **Tổng dung lượng 12 ảnh Wave 4:** `1,328.4 KB` (`1,360,276 bytes`; trung bình `110.7 KB/ảnh`).
- **Contact Sheet 3 Phe (4H · 4S · 4N):** [`character-contact-sheet.webp`](./character-contact-sheet.webp) & [`character-contact-sheet.png`](./character-contact-sheet.png).
- **Manifest đầy đủ kèm SHA-256:** [`asset-manifest.json`](./asset-manifest.json).
- **Chống trùng lặp:** Đã kiểm chứng toàn bộ **48/48** chân dung (`Classic + Starter Eight + Wave 2 + Wave 3 + Wave 4`) có **48 mã SHA-256 hoàn toàn khác biệt**.

---

## 2. Tích hợp UI, Cinematics & Bảo mật P0

1. **`features/boardgame/ui/midnight-noir-tokens.ts`:**
   - Khôi phục kiểu chặt `Readonly<Record<BoardGameRoleId, string>>` trên `MIDNIGHT_CHARACTER_ART` cho đủ **48/48** vai trò (compile-time guarantee không thiếu chân dung).
   - Xuất danh sách `WAVE4_ROLE_IDS: readonly Phase5RoleId[]` (12 vai Wave 4) dùng chung cho Prototype Lab & Unit Tests.
2. **`features/boardgame/ui/BoardGameVisualPrototypeView.tsx`:**
   - Bổ sung **Phần 5E (`data-testid="proto-section-wave4"`)** cho 12 tướng Wave 4 (`4 Hunter · 4 Shadow · 4 Neutral`), 4 tab lọc phe (`Tất cả 12 / Đội Săn Đêm 4 / Hội Bóng Đêm 4 / Kẻ Độc Hành 4`), chế độ bảo mật P0, lật 3D và Zoom Modal.
   - Cập nhật tổng thư viện ảnh Midnight tại Phần 4 lên **95 artwork AI WebP tối ưu**.
3. **Bảo mật P0 & Cinematic VFX:**
   - `resolveRoleCardPresentation` chặn hoàn toàn `portraitSrc`, `roleName`, `faction`, `maxHp` khỏi DOM khi chưa lật với người chơi khác hoặc khán giả.
   - `VisualEventTracker` & `extractVisualEventsFromDiff` kiểm chứng đủ 12 vai Wave 4 cho `OPENING_DEAL` (cách ly Spectator), `ROLE_REVEAL` và `reducedMotion`.

---

## 3. Kiểm chứng Tự động & Playwright Visual QA

- **Unit Test (`test/boardgame-phase5d-portraits.test.cjs`):** 5/5 PASS (xác thực 12 file WebP `1024×1536`, `< 200 KB`, 48/48 SHA-256 duy nhất, đồng bộ byte-for-byte với `asset-manifest.json`, ma trận bảo mật P0, VFX + Reduced Motion, và khóa production `classic`-only).
- **Playwright Visual QA (`scripts/verify-phase5d-visuals.cjs` & `test/boardgame-visual-prototype.cjs`):**
  - Desktop `1440×900` & Mobile `390×844`: 12/12 ảnh Wave 4 tải đủ `naturalWidth === 1024`, `naturalHeight === 1536`, đúng tỷ lệ `2:3`, `0px` horizontal overflow, `0` console/HTTP errors.
  - 4 tab lọc phe (`12 / 4 / 4 / 4`), P0 secrecy toggle xóa sạch `role-exp*.webp` khỏi DOM khi ẩn, Zoom Modal + lật 2 mặt qua đủ 3 phe (`Freyja`, `Usurper`, `Angel`), graceful `onError` fallback (`RolePortraitSvg`) khi giả lập lỗi tải `role-exp2-warlord.webp`, và Reduced Motion PASS.
