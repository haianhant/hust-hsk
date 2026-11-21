# Phase 7C — Báo cáo Mỹ thuật Chân dung AI Wave 6 & Hoàn thiện Bộ 66/66 Nhân vật

> **Art Direction:** `HUSTVerse Midnight — Cinematic Anime Noir`  
> **Quy mô Wave 6:** **8/8 nhân vật Tier-4 cuối cùng** (`1 Hunter · 3 Shadow · 4 Neutral`)  
> **Tổng thư viện chân dung:** **66/66 nhân vật** (`10 Classic + 56 Expansion` — **66/66 SHA-256 duy nhất tuyệt đối**, **113 tài nguyên WebP** gồm `66 Roles + 40 Cards + 6 KTX Locations + 1 Card Back`).

---

## 1. Bảng Nghiệm thu 8 Chân dung Wave 6 (`1024×1536` WebP)

| # | Role ID | Nhân vật | Phe | Đường dẫn Public | Dung lượng | Chất lượng | SHA-256 (12 ký tự đầu) | Trạng thái QA |
|---:|---|---|---|---|---:|---|---|---|
| 1 | `exp1_lloyd` | **Lloyd** | Hunter (`lantern-guard`) | `/assets/boardgame/roles/role-exp1-lloyd.webp` | 122.7 KB | `q=84` | `25f190b89723` | **APPROVED** |
| 2 | `exp1_vengeful_spirit` | **Vengeful Spirit** | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp1-vengeful-spirit.webp` | 72.9 KB | `q=84` | `a9177a5a5129` | **APPROVED** |
| 3 | `exp1_voodoo` | **Voodoo** | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp1-voodoo.webp` | 66.6 KB | `q=84` | `a5cca3dfdfd6` | **APPROVED** |
| 4 | `exp1_undead` | **Undead** | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp1-undead.webp` | 147.0 KB | `q=84` | `04733003b7de` | **APPROVED** |
| 5 | `exp1_antimony` | **Antimony** | Neutral (`wanderer`) | `/assets/boardgame/roles/role-exp1-antimony.webp` | 101.4 KB | `q=84` | `d16119a852ad` | **APPROVED** |
| 6 | `exp2_cain` | **Cain** | Neutral (`wanderer`) | `/assets/boardgame/roles/role-exp2-cain.webp` | 141.0 KB | `q=84` | `4330a5cf417c` | **APPROVED** |
| 7 | `exp2_bonnie` | **Bonnie** | Neutral (`wanderer`) | `/assets/boardgame/roles/role-exp2-bonnie.webp` | 110.5 KB | `q=84` | `5aa038f9a9c4` | **APPROVED** |
| 8 | `exp2_nc_soldier` | **N.C. Soldier** | Neutral (`wanderer`) | `/assets/boardgame/roles/role-exp2-nc-soldier.webp` | 118.6 KB | `q=84` | `57a2f859c375` | **APPROVED** |

- **Tổng dung lượng Wave 6:** `880.7 KB` (trung bình **`110.1 KB`/ảnh** — 8/8 dưới ngưỡng ưu tiên `< 200 KB`).
- **Tỷ lệ & Định dạng:** `1024×1536` (`2:3` chính xác), không chữ/watermark/viền khung, duyệt thị giác từng ảnh gốc và cả hai Contact Sheet.
- **Tài liệu đi kèm:**
  - Prompt từng nhân vật: [`character-art-prompts.md`](./character-art-prompts.md)
  - Manifest SHA-256: [`asset-manifest.json`](./asset-manifest.json)
  - Contact Sheet 8 nhân vật Wave 6: [`character-contact-sheet.webp`](./character-contact-sheet.webp) / [`character-contact-sheet.png`](./character-contact-sheet.png)
  - Contact Sheet trọn bộ **66 nhân vật**: [`full-catalog-contact-sheet.webp`](./full-catalog-contact-sheet.webp) / [`full-catalog-contact-sheet.png`](./full-catalog-contact-sheet.png)

---

## 2. Tích hợp UI, Cinematic & Visual QA

- **Strict 66/66 Mapping:** Khôi phục kiểu `Readonly<Record<BoardGameRoleId, string>>` trong [`midnight-noir-tokens.ts`](../../../features/boardgame/ui/midnight-noir-tokens.ts) bao phủ đủ 66/66 nhân vật cho Role Card, Opening Secret Deal, Role Reveal, Card Zoom Modal, Character Pawn, VFX và Match Result.
- **Visual Prototype Section 5G:** Bổ sung mục `proto-section-wave6` tại [`BoardGameVisualPrototypeView.tsx`](../../../features/boardgame/ui/BoardGameVisualPrototypeView.tsx) kèm bộ lọc 3 phe (`Tất cả (8)`, `Đội Săn Đêm (1)`, `Hội Bóng Đêm (3)`, `Kẻ Độc Hành (4)`), mô phỏng bảo mật P0, lật 3D và phóng lớn 🔍.
- **Kiểm thử tự động & Playwright Visual QA:**
  - [`test/boardgame-phase7c-portraits.test.cjs`](../../../test/boardgame-phase7c-portraits.test.cjs): xác minh 66/66 SHA-256 duy nhất, 1024×1536, `< 200 KB`, manifest khớp byte-for-byte, ma trận P0 secrecy, Opening Deal / Role Reveal / Spectator / Reduced Motion và khóa production Classic-only.
  - [`scripts/verify-phase7c-visuals.cjs`](../../../scripts/verify-phase7c-visuals.cjs): Playwright Desktop (`1440×900`) & Mobile (`390×844`), 0px overflow, kiểm tra ẩn ảnh DOM khi chưa lật, Zoom Modal 2 mặt (`Lloyd`, `Voodoo`, `Cain`, `N.C. Soldier`), fallback `RolePortraitSvg` khi ảnh lỗi và `prefers-reduced-motion: reduce`.
  - [`test/boardgame-visual-prototype.cjs`](../../../test/boardgame-visual-prototype.cjs): hồi quy toàn bộ trang Visual Prototype.
