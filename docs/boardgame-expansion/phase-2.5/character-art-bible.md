# Bóng Đêm KTX — Phase 2.5 Character Art Bible (`HUSTVerse Midnight — Anime Noir`)

> **Phạm vi:** Tài liệu chuẩn hóa định hướng mỹ thuật (Art Direction) cho 8 tướng mở rộng đầu tiên (**Starter Eight** — Phase 2.5) của *Bóng Đêm KTX*, bảo đảm đồng bộ tuyệt đối với 10 chân dung Classic hiện hữu tại `public/assets/boardgame/roles/` và `public/assets/boardgame/prototype/`.
> **Bất biến:** Không thay đổi gameplay, HP, kỹ năng, phe phái, RNG hay cấu hình multiplayer.

---

## 1. Phân tích DNA Mỹ thuật của 10 Nhân vật Classic (Style Baseline)

Qua kiểm định trực tiếp 10 ảnh chân dung Classic (`role-minh-ky-thuat.webp`, `role-vy-radio.webp`, `role-lan-truc-ban.webp`, `role-tu-an-danh.webp`, `role-khanh-tin-gia.webp`, `role-dung-gac-cong.webp`, `role-hai-suu-tam.webp`, `role-trang-kien-cuong.webp`, `role-bach-cuong-chien.webp`, `role-dat-cam-tu.webp`):

| Thuộc tính | Chuẩn hiện hữu của 10 Classic | Yêu cầu bắt buộc cho 8 tướng Phase 2.5 |
|---|---|---|
| **Tỷ lệ khung hình** | `2:3` dọc (working `1024×1536`, xuất WebP tối ưu) | Native `2:3` portrait (`1024×1536` hoặc `720×1080` WebP, `< 500 KB`) |
| **Kỹ thuật vẽ** | Minh họa 2D Anime Noir bán tả thực: nét viền mực đen sắc nét (`crisp dark ink outlines`), tô màu sơn dầu kết hợp cel-shading tinh tế | Tuyệt đối không dùng nhựa 3D, không chibi, không nét mặt anime đại trà |
| **Bố cục Safe Zone** | **Top 14%:** Khoảng trống trời đêm / trần nhà để đặt Huy hiệu Phe & Con dấu HP.<br>**Middle 58% (`15%–72%`):** Khuôn mặt (trọng tâm `18%–44%`), vai, tay và đạo cụ nhận diện.<br>**Bottom 28% (`72%–100%`):** Chuyển dần về tối đậm (`#050811`) cho bảng tên & kỹ năng. | Giữ đúng vùng an toàn để `object-cover object-top` hiển thị hoàn hảo từ avatar tròn 20px–40px (`PlayerPawnToken`) đến thẻ 2:3 full-art & Zoom Modal |
| **Bối cảnh** | Môi trường KTX / khuôn viên đại học Việt Nam về đêm: mưa phùn, sương mù, sân thượng cột ăng-ten, hành lang cầu thang bê tông, cổng sắt đêm | Kết hợp yếu tố siêu nhiên/công nghệ với không gian đêm KTX & giảng đường Bách Khoa |
| **Ánh sáng (Lighting)** | Nền xanh đậm – chàm đêm (`#060b11` / `#0c1324`), viền sáng ngược mạnh (`dramatic rim lighting`) theo phe, 1–2 nguồn phát sáng có kiểm soát | Không đốt cháy sáng toàn khung, giữ tương phản khuôn mặt sắc nét ở kích thước mobile |

---

## 2. Ngôn ngữ Thị giác theo Phe (Faction Visual Language)

### 2.1. Đội Săn Đêm — Hunter (`lantern-guard`)
- **Bảng màu chủ đạo:** Bạc lạnh (`#cbd5e1`), xanh ngọc / cyan (`#10b981` / `#22d3ee`), điểm nhấn hổ phách / vàng kim có kiểm soát (`#fbbf24` / `#f59e0b`).
- **Tông cảm xúc:** Kiên định, bảo vệ, phân tích, năng động và cảnh giác trong đêm.
- **Chất liệu & Trang phục:** Giáp cơ khí phòng vệ, áo khoác sinh viên hiện đại, đồ thể thao đô thị, túi chuyên dụng, thiết bị điều tra/nhắm mục tiêu công nghệ gọn.
- **4 tướng Phase 2.5:** `G43` (`exp2_g43`), `Fiona` (`exp2_fiona`), `Gayle` (`exp1_gayle`), `Felicia` (`exp1_felicia`).

### 2.2. Hội Bóng Đêm — Shadow (`mist-order`)
- **Bảng màu chủ đạo:** Tím huyền bí (`#a855f7` / `#7e22ce`), đỏ huyết ngọc (`#e11d48` / `#f43f5e`), đen than obsidian (`#07060d`), sương đêm chàm.
- **Tông cảm xúc:** Bí ẩn, áp bức, siêu nhiên, nguy hiểm và biến dị lạnh gáy (kinh dị tinh tế, **không** máu me ghê rợn / graphic gore).
- **Chất liệu & Trang phục:** Khí tức sương mù đỏ-tím, giáp đen nứt phát sáng, cánh rồng vảy tối, áo choàng nghiên cứu đêm nhăn nheo với thiết bị thí nghiệm dị thường.
- **4 tướng Phase 2.5:** `Wendigo` (`exp1_wendigo`), `Wyvern` (`exp2_wyvern`), `Victor` (`exp1_victor`), `Undying` (`exp1_undying`).

### 2.3. Kẻ Độc Hành — Neutral (`wanderer`) *(Tham chiếu tổng thể)*
- Bảng màu hổ phách & bạc phay xước linh hoạt, mang bản sắc cá nhân và tính lưỡng nghĩa. *(Phase 2.5 không có tướng Neutral mới; 4 tướng Neutral trong `starter-eight` vẫn là 4 Classic).*

---

## 3. Tiêu chuẩn Cấm (Hard Visual Reject Rules)

Mọi ảnh sinh ra vi phạm bất kỳ điểm nào sau đây **bắt buộc từ chối và sinh lại**:
1. Có chữ viết, tên nhân vật, ký tự rác, khung viền thẻ bài hoặc watermark bên trong ảnh.
2. Sai tỷ lệ (không phải dọc `2:3`) hoặc bị cắt đỉnh đầu / che mặt ở vùng top 14% / vùng plaque đáy 28%.
3. Phong cách 3D bóng nhựa, chibi, hoặc khuôn mặt anime generic giống hệt nhau.
4. Thiết kế hở hang quá đà (over-sexualized) hoặc máu me ghê rợn (graphic gore).
5. Lỗi giải phẫu rõ rệt (ngón tay dị dạng, hai tay biến dạng, vũ khí gãy nối vô lý, mắt lệch).
6. Quá giống một trong 10 nhân vật Classic hiện có (ví dụ trùng áo khoác đỏ-trắng Minh hay bộ đàm Vy).
7. Sao chép bố cục/minh họa thẻ bài gốc của Shadow Hunters.

---

## 4. Bản đồ Các Component Hiển thị Chân dung & Ràng buộc Bảo mật P0

Toàn bộ UI đọc tập trung từ **`MIDNIGHT_CHARACTER_ART`** trong [`features/boardgame/ui/midnight-noir-tokens.ts`](../../../features/boardgame/ui/midnight-noir-tokens.ts):

| Component | Nguồn dữ liệu | Framing / Tỷ lệ | Ràng buộc Bảo mật P0 |
|---|---|---|---|
| `MidnightCharacterCard.tsx` | `resolveRoleCardPresentation()` | Full-art `2:3`, `object-cover object-top`, fallback `RolePortraitSvg` khi lỗi tải ảnh | Chỉ render `portraitSrc` khi `showFront === true` (`revealed` hoặc `owner-peek`) |
| `RoleCard.tsx` | Bọc `MidnightCharacterCard` | Sidebar 2:3 & tab nhân vật Mobile | Spectator luôn nhận `privateView === null` → không bao giờ nhận vai ẩn |
| `MidnightCardZoomModal.tsx` | `resolveRoleCardPresentation()` | Phóng lớn `310–350px` 2:3 + lật mặt lưng | Chặn lật mặt trước khi chưa được phép |
| `BoardGameArt.tsx` (`PlayerPawnToken`) | `revealedRoleId ? MIDNIGHT_CHARACTER_ART[revealedRoleId] : null` | Avatar tròn `20px–40px`, `object-cover object-top` | Tuyệt đối chỉ hiển thị ảnh sau khi `revealedRoleId !== null` |
| `vfx-queue.ts` + `BoardGameVfxStage.tsx` | `getRevealPortrait(roleId)` | `OPENING_DEAL` (chỉ chính chủ), `ROLE_REVEAL` (sau server reveal), `ULTIMATE_SKILL` / `ELIMINATION` | Spectator `OPENING_DEAL` có `portraitSrc: null`; không bắn cut-in cho vai chưa lật |
| `MatchResult.tsx` | `publicGame.finalReveal` | Thumbnail `32×44px` (`h-11 w-8`), `object-cover object-top` | Chỉ xuất hiện khi trận kết thúc (`status === 'FINISHED'`) |
