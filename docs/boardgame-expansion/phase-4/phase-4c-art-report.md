# Bóng Đêm KTX — Phase 4C Art Direction, Portrait QA & Visual Integration Report

> **Milestone:** Phase 4C — Hoàn thiện 10 Chân dung Wave 3 (`starter-twenty-six`), nâng tổng số chân dung Full-Art 2:3 lên **36/36 nhân vật chơi được** (`10 Classic + 8 Starter Eight + 8 Wave 2 + 10 Wave 3`) và tổng thư viện nghệ thuật Midnight lên **83 WebP assets**.  
> **Phong cách:** `HUSTVerse Midnight — Cinematic Anime Noir` (đồng bộ tuyệt đối với Art Bible [`phase-2.5/character-art-bible.md`](../phase-2.5/character-art-bible.md)).  
> **Production Safety:** Không thay đổi gameplay, HP, RNG hay mở khóa ruleset mở rộng trên production (`classic` only).

---

## 1. Bảng Kiểm định 10 Chân dung Wave 3 (`1024×1536` WebP)

Toàn bộ 10 chân dung được sinh bằng `image-generator`, kiểm định thủ công bằng mắt trực tiếp trước khi đóng gói và xử lý qua [`scripts/process-phase4c-portraits.py`](../../../scripts/process-phase4c-portraits.py) tại chất lượng WebP `q=84` (`method=6`). **Cả 10/10 file đều đạt dưới 110 KB** (thấp hơn rất nhiều so với ngưỡng mục tiêu `< 200 KB` và trần `< 500 KB`).

| # | Role ID | Nhân vật | Phe | File Asset | Kích thước | Dung lượng | SHA-256 (12 ký tự đầu) | Trạng thái QA |
|---|---|---|---|---|---|---:|---|---|
| 1 | `exp1_fallen` | Fallen | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp1-fallen.webp` | `1024×1536` (`2:3`) | `105.9 KB` | `18d92b19f8e8` | APPROVED |
| 2 | `exp1_fea` | Fea | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp1-fea.webp` | `1024×1536` (`2:3`) | `86.0 KB` | `edab80ae2d75` | APPROVED |
| 3 | `exp2_eleanor` | Eleanor | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-eleanor.webp` | `1024×1536` (`2:3`) | `83.5 KB` | `4dec2e3be875` | APPROVED |
| 4 | `exp2_fujiko` | Fujiko | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-fujiko.webp` | `1024×1536` (`2:3`) | `101.1 KB` | `a18533b07815` | APPROVED |
| 5 | `exp1_udi` | Udi | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp1-udi.webp` | `1024×1536` (`2:3`) | `63.5 KB` | `3c9dd5d15782` | APPROVED |
| 6 | `exp1_wrath` | Wrath | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp1-wrath.webp` | `1024×1536` (`2:3`) | `104.1 KB` | `5b614d7072da` | APPROVED |
| 7 | `exp1_vengeance` | Vengeance | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp1-vengeance.webp` | `1024×1536` (`2:3`) | `105.6 KB` | `343b2764d4a1` | APPROVED |
| 8 | `exp2_visions` | Visions | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-visions.webp` | `1024×1536` (`2:3`) | `67.0 KB` | `76922aaf5d39` | APPROVED |
| 9 | `exp2_cruz` | Cruz | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-cruz.webp` | `1024×1536` (`2:3`) | `108.2 KB` | `677a075284ae` | APPROVED |
| 10 | `exp2_bryon` | Bryon | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp2-bryon.webp` | `1024×1536` (`2:3`) | `97.2 KB` | `dde0e02b349a` | APPROVED |

- **Tổng dung lượng 10 ảnh Wave 3:** `922.1 KB` (trung bình `92.2 KB/ảnh`).
- **Contact Sheet 3 Phe:** [`character-contact-sheet.webp`](./character-contact-sheet.webp) & [`character-contact-sheet.png`](./character-contact-sheet.png).
- **Manifest đầy đủ kèm SHA-256:** [`asset-manifest.json`](./asset-manifest.json).
- **Chống trùng lặp:** Đã kiểm chứng toàn bộ **36/36** chân dung (`Classic + Starter Eight + Wave 2 + Wave 3`) có 36 mã SHA-256 hoàn toàn khác biệt.

---

## 2. Tích hợp UI & Bảo mật P0

1. **`features/boardgame/ui/midnight-noir-tokens.ts`:**
   - Khôi phục kiểu chặt `Readonly<Record<BoardGameRoleId, string>>` trên `MIDNIGHT_CHARACTER_ART` cho đủ **36/36** vai trò (compile-time guarantee không thiếu chân dung).
   - Xuất danh sách `WAVE3_ROLE_IDS` dùng chung cho Prototype Lab & Unit Tests.
2. **`features/boardgame/ui/BoardGameVisualPrototypeView.tsx`:**
   - Bổ sung **Phần 5D (`data-testid="proto-section-wave3"`)** cho 10 tướng Wave 3 (`4 Hunter · 4 Shadow · 2 Neutral`), 4 tab lọc phe (`Tất cả 10 / Đội Săn Đêm 4 / Hội Bóng Đêm 4 / Kẻ Độc Hành 2`), chế độ bảo mật P0, lật 3D và Zoom Modal.
   - Cập nhật tổng thư viện ảnh Midnight tại Phần 4 lên **83 artwork AI WebP tối ưu**.
3. **Bảo mật P0 & Cinematic VFX:**
   - `resolveRoleCardPresentation` chặn hoàn toàn `portraitSrc`, `roleName`, `faction`, `maxHp` khỏi DOM khi chưa lật với người chơi khác hoặc khán giả.
   - `VisualEventTracker` & `extractVisualEventsFromDiff` kiểm chứng đủ 10 vai Wave 3 cho `OPENING_DEAL` (cách ly Spectator), `ROLE_REVEAL` và `reducedMotion`.

---

## 3. Kiểm chứng Tự động & Playwright Visual QA

- **Unit Test (`test/boardgame-phase4c-portraits.test.cjs`):** 5/5 PASS (xác thực 10 file WebP `1024×1536`, `< 200 KB`, 36/36 SHA-256 duy nhất, đồng bộ byte-for-byte với `asset-manifest.json`, ma trận bảo mật P0, VFX + Reduced Motion, và khóa production `classic`-only).
- **Playwright Visual QA (`scripts/verify-phase4c-visuals.cjs` & `test/boardgame-visual-prototype.cjs`):**
  - Desktop `1440×900` & Mobile `390×844`: 10/10 ảnh tải đủ `naturalWidth === 1024`, `naturalHeight === 1536`, đúng tỷ lệ `2:3`, `0px` horizontal overflow, 0 console/HTTP errors.
  - 4 tab lọc phe (`10 / 4 / 4 / 2`), P0 secrecy toggle xóa sạch `role-exp*.webp` khỏi DOM khi ẩn, Zoom Modal + lật 2 mặt qua đủ 3 phe (`Fujiko`, `Vengeance`, `Cruz`), graceful `onError` fallback (`RolePortraitSvg`) khi giả lập lỗi tải `role-exp1-wrath.webp`, và Reduced Motion PASS.
