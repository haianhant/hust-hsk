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

---

## 6. Hệ Thống Combat VFX & Visual Event Queue (Giai đoạn 2)

> Triển khai tại [`vfx-queue.ts`](../../features/boardgame/ui/vfx-queue.ts), [`BoardGameVfxStage.tsx`](../../features/boardgame/ui/BoardGameVfxStage.tsx) và [`BoardGameVfxSandbox.tsx`](../../features/boardgame/ui/BoardGameVfxSandbox.tsx).

1. **Visual Event Queue chỉ phản chiếu delta đã được server xác nhận (`vfx-queue.ts`):**
   - Mọi hiệu ứng được suy diễn thuần từ `BoardGamePublicGameView` (`publicLog` ID duy nhất + delta `lastDiceRoll` + `lastRevealEvent` + trạng thái `alive`/`winnerFaction`) — **tuyệt đối không tự tung xúc xắc hay quyết định sát thương ở client**.
   - Thứ tự xử lý ưu tiên cố định mỗi nhịp: `DICE_ROLL` → `CARD_DRAW` → `CINEMATIC_CUTIN (ROLE_REVEAL / ULTIMATE_SKILL)` → `COMBAT_VFX` → `FLOATING_TEXT` → `CINEMATIC_CUTIN (ELIMINATION / VICTORY / YOUR_TURN)`.
   - Chống phát trùng khi reload/F5 bằng `VisualEventTracker` kết hợp `sessionStorage`: lần hydrate đầu tiên (*baseline*) đánh dấu toàn bộ log/dice/reveal/turn cũ vào bộ nhớ đã xử lý và chỉ phát animation cho các delta mới về sau.
   - **Bảo mật P0 qua VFX:** Người chưa lộ vai (`revealedRoleId === null`) không bao giờ kích hoạt banner tên vai/tuyệt kỹ; thẻ Khám Phá (Xanh) và Bẫy Đỏ chỉ lật mặt trước khi người xem là người tham gia hoặc được phép nhìn, còn người ngoài bàn / khán giả (`isSpectator`) chỉ thấy mặt lưng Ấn Ký.
2. **Kiến trúc Render & Hiệu năng (`BoardGameVfxStage.tsx`):**
   - Toàn bộ Combat VFX (đường nhắm mục tiêu SVG, vệt chém, Kiếm Gỗ Nguyền Rủa Masamune, Súng Ngắn, Súng Liên Thanh đa mục tiêu, Sét Vy Radio, Vụ nổ, Phản kích Dũng, Hồi máu, Lá chắn `BLOCK`, Dây cướp trang bị), Floating Text (`-5`, `+2`, `BLOCK`, `COUNTER`), Xúc xắc 3D nảy & khóa mặt theo `d6/d4` của server, Lật thẻ 3D và Cut-in chân dung lớn sử dụng **duy nhất CSS transforms, SVG và 1 Canvas 2D chung** (tự dừng `requestAnimationFrame` khi rảnh, **0 WebGL context phụ**).
   - Toàn bộ lớp phủ dùng `pointer-events-none` và không bao giờ chặn đồng hồ lượt hay thao tác server; nút **`Skip Animation`** (`Bỏ qua hiệu ứng`) và chế độ **`prefers-reduced-motion`** (cùng nút toggle trên thanh công cụ) rút gọn hoặc bỏ qua mọi chuyển động/rung màn hình tức thì.

---

## 7. Thư Viện Tài Nguyên Hoàn Chỉnh & Bản Đồ Tabletop KTX (Giai đoạn 3)

1. **Quy mô Thư viện 57 Asset WebP (`public/assets/boardgame/`):**
   - **10/10 Nhân vật Full-Art (`2:3`, `720×1080` WebP):** `MIDNIGHT_CHARACTER_ART` ánh xạ đủ 3 Đội Săn Đêm (`gac-ky-thuat`, `gac-truc-ban`, `gac-radio`), 3 Hội Bóng Đêm (`suong-an-danh`, `suong-tin-gia`, `suong-gac-cong`) và 4 Kẻ Độc Hành (`lang-anh-san`, `lang-quan-sat`, `lang-cuu-ho`, `lang-tien-phong`), dùng chung cho thẻ `MidnightCharacterCard`, cut-in VFX, quân cờ sau khi lật và `MatchResult`.
   - **40 loại thẻ riêng biệt / 48 bản sao (`2:3`, `600×900` WebP):** `MIDNIGHT_CARD_ART` & `MIDNIGHT_CARD_STAT_BADGE` phủ đủ 12 loại Khám Phá (16 lá), 15 loại Cung Ứng (16 lá) và 13 loại Đột Kích (16 lá); gắn `loading="lazy"` + `decoding="async"` và giữ `artworkSrc = null` trên chồng bài rút hoặc thẻ điều tra với người ngoài cuộc.
   - **6 Địa điểm Tabletop KTX (`16:9`, `960×540` WebP):** `MIDNIGHT_LOCATION_ART` & `MIDNIGHT_LOCATION_AMBIENCE` minh họa `radio`, `breaker`, `lobby`, `canteen`, `corridor`, `court` qua [`TabletopLocationTile.tsx`](../../features/boardgame/ui/TabletopLocationTile.tsx) với ánh đèn điểm, lớp sương đêm nhẹ (tắt khi `prefers-reduced-motion`), viền nổi 3D và khay quân cờ đế nổi.
   - **1 Mặt lưng Ấn Ký Chung:** [`card-back-midnight-seal.webp`](../../public/assets/boardgame/prototype/card-back-midnight-seal.webp) cho mọi trạng thái úp bài và chồng bài (`DeckCardBackSvg`).
2. **Tương tác, Di chuyển Quân cờ & Phóng lớn Thẻ:**
   - **Phóng lớn & Lật Soi ([`MidnightCardZoomModal.tsx`](../../features/boardgame/ui/MidnightCardZoomModal.tsx)):** Xem chi tiết 2 mặt ở kích thước lớn, chỉ cho phép lật xem mặt trước khi hợp lệ theo luật P0.
   - **Quân cờ đế nổi & Di chuyển mượt ([`BoardGameArt.tsx`](../../features/boardgame/ui/BoardGameArt.tsx), [`useSmoothPawnGlide.ts`](../../features/boardgame/ui/useSmoothPawnGlide.ts)):** Quân cờ chỉ hiện chân dung khi `revealedRoleId !== null`, sử dụng kỹ thuật FLIP Web Animations API để trượt parabol `520ms` giữa các ô địa điểm mà không chặn thao tác server.
