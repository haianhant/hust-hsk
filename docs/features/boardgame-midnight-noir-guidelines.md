# HUSTVerse Midnight — Anime Noir: Art Tokens & Asset Guidelines

> Tài liệu chuẩn hóa mỹ thuật cho **Bóng Đêm KTX (Shadow Hunters)** thuộc **HUSTVerse — Bách Khoa 3D**, lấy cảm hứng từ chất lượng trình bày của *Legends of Runeterra*, *Marvel Snap* và *Tam Quốc Sát* nhưng mang thiết kế nguyên bản gắn với đời sống sinh viên KTX Đại học Bách khoa Hà Nội ban đêm.

---

## 1. Art Direction Tổng thể

- **Chủ đề:** *HUSTVerse Midnight — Anime Noir*.
- **Ánh sáng & Nét vẽ:** Nét mực anime sắc nét (crisp cel-shaded ink linework) kết hợp tương phản sáng–tối điện ảnh (*chiaroscuro*), sương mưa KTX ban đêm và viền ánh sáng (*rim lighting*) rực màu theo phe/loại bài.
- **Nguyên tắc phân tách Artwork vs UI Vector:**
  - Artwork AI chỉ vẽ thuần minh họa toàn khung (*full-bleed*), **tuyệt đối không nhúng chữ, số, viền khung thẻ hay watermark trong ảnh**.
  - Toàn bộ tên nhân vật, huy hiệu phe, con dấu HP, khung kim loại, hiệu ứng Foil Shimmer và mô tả kỹ năng được render bằng Vector SVG + React DOM sắc nét trên mọi độ phân giải và đa ngôn ngữ.

---

## 2. Hệ Thống Art Tokens (Nguồn chuẩn tại [`midnight-noir-tokens.ts`](../../features/boardgame/ui/midnight-noir-tokens.ts))

### 2.1. Bảng Màu 3 Phe Nhân Vật (`MIDNIGHT_FACTION_TOKENS`)

| Phe | Định danh | Tông màu chủ đạo | Primary / Secondary Hex | Cảm giác chất liệu khung |
| :--- | :--- | :--- | :--- | :--- |
| **Đội Săn Đêm** | `lantern-guard` | **Emerald / Gold** | `#10b981` / `#fbbf24` | Đồng vàng rực kết hợp ánh đèn bão ngọc lục bảo |
| **Hội Bóng Đêm** | `mist-order` | **Crimson / Violet** | `#f43f5e` / `#a855f7` | Kim loại sẫm khắc huy hiệu huyết ngọc & tím sương đêm |
| **Kẻ Độc Hành** | `wanderer` | **Amber / Silver** | `#f59e0b` / `#cbd5e1` | Thép bạc phay xước lạnh lùng điểm xuyết hổ phách |

### 2.2. Bảng Màu 3 Chồng Bài Chức Năng (`MIDNIGHT_DECK_TOKENS`)

| Bộ bài | `deck` | Accent / Secondary Hex | Nhãn hiển thị |
| :--- | :--- | :--- | :--- |
| **Thẻ Điều Tra** | `investigation` | `#10b981` / `#f59e0b` | `Khám Phá Kín · 1-Đối-1` |
| **Thẻ Trang Bị** | `equipment` | `#38bdf8` / `#e2e8f0` | `Cung Ứng · Thánh Khí & Giáp` |
| **Thẻ Đột Kích** | `event` | `#f43f5e` / `#a855f7` | `Sự Kiện & Vũ Khí Nguyền Rủa` |

---

## 3. Thông số Khung Thẻ Tỷ lệ 2:3 & Safe-Zone Layout

- **Tỷ lệ khung chuẩn:** `aspect-[2/3]` (`border-radius: 20px` ngoài, `17.5px` lồng trong, viền kim loại `2.5px`).
- **Quy chuẩn kích thước file ảnh:**
  - Đầu ra chuẩn: **`720 × 1080 px` (tỷ lệ 2:3)**, định dạng **`WebP` (`quality=92`, `method=6`)**.
  - Dung lượng mục tiêu: **80–160 KB / thẻ nhân vật hoặc thẻ hành động** (`<= 240 KB` với mặt lưng phức tạp).
  - Bố cục an toàn (Safe Zones) trong tranh AI:
    - **Top `0% – 14%`:** Khoảng thở cho đỉnh đầu/vũ khí, chừa 2 góc trên cho Huy hiệu Phe/Loại bài & Con dấu HP/Chỉ số.
    - **Middle `14% – 72%`:** Tâm điểm thị giác (bán thân chest-up hoặc vật phẩm chính).
    - **Bottom `72% – 100%` (28% đáy):** Vùng tối chuyển sắc (*obsidian shadow vignette*) để bảng kính mờ chứa Tên + Kỹ năng/Mô tả đạt độ tương phản cao (`>= 7:1`).

---

## 4. Quy Chuẩn Prompt Mở Rộng cho 8 Nhân Vật & 45 Lá Bài Còn Lại

Khi sinh thêm artwork cho các thẻ còn lại:
1. Bắt đầu với tiền tố:
   `High-detail 2:3 vertical anime-noir illustration (Legends of Runeterra / cel-shaded chiaroscuro ink style), moody midnight HUST campus dormitory atmosphere...`
2. Khóa ánh sáng viền (*rim light*) đúng với phe/chồng bài:
   - Săn Đêm: `#10b981` emerald + `#fbbf24` warm gold.
   - Bóng Đêm: `#f43f5e` crimson + `#a855f7` deep violet.
   - Độc Hành: `#f59e0b` amber + `#cbd5e1` cold brushed silver.
3. Kết thúc prompt luôn có ràng buộc cứng:
   `Frame bust/focal object in middle 58%, bottom 28% smoothly darkened into deep obsidian shadow for UI overlay. STRICT: ZERO text, ZERO letters, ZERO numbers, ZERO card borders, ZERO watermarks.`

---

## 5. Luật Bảo Mật Hiển Thị Mặt Bài (P0 Secrecy Rules)

Mọi giao diện mới bắt buộc sử dụng 2 hàm lọc thuần trong [`midnight-noir-tokens.ts`](../../features/boardgame/ui/midnight-noir-tokens.ts):
1. `resolveRoleCardPresentation()`:
   - Chỉ khi `revealed === true` hoặc `viewerMode === 'owner-peek'` mới được trả về `showFront: true`, `roleId`, `faction`, `maxHp`, `portraitSrc`.
   - Trong trạng thái ẩn (`owner-facedown`, `other-player`, `spectator`), các trường bí mật **bắt buộc bằng `null`** để DOM không rò rỉ đường dẫn ảnh hay danh tính; mặt lưng chỉ giữ số vết thương công khai.
2. `resolveActionCardPresentation()`:
   - Trên chồng bài (`draw-pile`): `showFront: false`, chỉ hiển thị mặt lưng Ấn Ký theo đúng màu chồng bài.
   - Thẻ Điều tra (`private-investigation`): chỉ `isParticipantInInvestigation === true` (người đưa & người nhận) mới thấy mặt trước.
   - Trang bị đang đeo (`equipped-table`) & Đột Kích vừa lật (`event-resolved`): hiển thị công khai toàn bàn.
