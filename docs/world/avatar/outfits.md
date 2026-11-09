# Đặc tả Module: Hệ thống 10 Bộ Đồng phục HUST & Phụ kiện (`Avatar Outfits`)

## 1. Tổng quan & Hợp đồng Dữ liệu

Toàn bộ 10 mẫu đồng phục sinh viên Đại học Bách khoa Hà Nội được định danh bằng kiểu [`AvatarOutfitId`](../../../shared/contracts/multiplayer.ts#L16-L26) tại `shared/contracts/multiplayer.ts` và ánh xạ sang cấu hình hiển thị 3D qua hàm [`getOutfitVisualSpec`](../../../components/three/StudentAvatar.tsx) trong [`components/three/StudentAvatar.tsx`](../../../components/three/StudentAvatar.tsx).

- **Source Paths:**
  - Hợp đồng ID & kiểm tra hợp lệ: [`shared/contracts/multiplayer.ts`](../../../shared/contracts/multiplayer.ts)
  - Lưu trữ hồ sơ & danh mục UI: [`lib/identity.ts`](../../../lib/identity.ts), [`components/ui/CharacterCreatorModal.tsx`](../../../components/ui/CharacterCreatorModal.tsx)
  - Dựng hình 3D & vật liệu: [`components/three/StudentAvatar.tsx`](../../../components/three/StudentAvatar.tsx)
- **Reference Assets:**
  - Bộ ảnh & danh mục 10 mẫu đồng phục tại [`tham-khao/dong-phuc/`](../../../tham-khao/dong-phuc/README.md) (`ao-khoac-gio-do-chi-tiet-01.jpg`, `polo-do-nam-01.jpg`, `polo-do-nam-nu-01.jpg` cùng 7 mô tả mẫu từ bộ sưu tập đồng phục ĐHBK Hà Nội).
- **Current Implementation Status:** **Production** (Đã hoàn thiện đủ 10 bộ và đồng bộ qua Multiplayer ở Đợt 7 & Đợt 8).

---

## 2. Bảng Đặc tả 10 Mẫu Đồng phục Chuẩn (`VALID_OUTFIT_IDS`)

| Module ID | Mã `AvatarOutfitId` | Tên Hiển thị | Đặc điểm Hình học & Phối màu Bất biến (`Invariants`) |
|---|---|---|---|
| `avatar.outfit.windbreaker` | `'windbreaker-hust'` | **Áo khoác gió HUST (Mặc định)** | Phối 2 mảng màu đặc trưng: **ngực trên & vai màu trắng kem (`#F4F6F9`)** + **thân dưới màu đỏ Bách khoa (`#B5121B`)** phân tách bởi đường cắt chữ V (chevron) trước ngực; cổ trụ đứng, khóa kéo dọc chính giữa, chữ `HUST` ngực trái và huy hiệu tròn trên bắp tay trái. |
| `avatar.outfit.bomber` | `'bomber-red-grey'` | **Bomber HUST Đỏ – Ghi** | Thân áo đỏ đậm Bách khoa phối **tay áo màu xám ghi sáng (`#C8CDD4`)**, cổ/bo tay/gấu áo dệt kim kẻ sọc thể thao, chữ `HUST` trắng trước ngực. |
| `avatar.outfit.bomber` | `'bomber-navy-white'` | **Bomber HUST Xanh – Trắng** | Thân áo xanh tím than (`#1E3250`) phối **tay áo trắng kem (`#F2F4F7`)**, cổ và bo tay dệt kim kẻ sọc. |
| `avatar.outfit.bomber` | `'bomber-red-navy'` | **Bomber HUST Đỏ – Xanh** | Thân áo đỏ Bách khoa phối **tay áo xanh tím than (`#1E3250`)**, cổ và bo tay dệt kim kẻ sọc. |
| `avatar.outfit.polo` | `'polo-red'` | **Áo Polo Đỏ HUST** | Thân áo đỏ tươi (`#DA1E26`), cổ bẻ có viền trắng mảnh, nẹp 2 cúc tối màu, tay ngắn lộ cẳng tay, chữ `HUST` trắng ở ngực trái và phù hiệu tay áo. |
| `avatar.outfit.hoodie` | `'hoodie-hust'` | **Áo Hoodie Đỏ BK** | Áo nỉ dài tay màu đỏ Bách khoa có mũ trùm phía sau cổ, túi kangaroo trước bụng, bo tay/gấu áo, chữ `HUST` trước ngực và huy hiệu tròn cánh tay trái. |
| `avatar.outfit.tshirt` | `'tshirt-navy'` | **Áo phông Xanh HUST** | Áo thun cổ tròn tay ngắn màu xanh tím than (`#1B2D48`), in chữ `HUST` trắng lớn giữa ngực và huy hiệu đỏ trên tay áo (mặc định bật chân váy trắng khi chọn giới tính Nữ). |
| `avatar.outfit.shirt` | `'shirt-white'` | **Áo sơ mi Trắng SV** | Sơ mi trắng lịch sự (`#F5F5F0`), cổ Đức, nẹp cúc dọc, đeo dây thẻ sinh viên đỏ HUST. |
| `avatar.outfit.shirt` | `'sport-pe'` | **Áo sơ mi Xanh / Thể chất** | Áo xanh dương nhạt trẻ trung phối quần thể thao xanh tím than tối có sọc dọc. |
| `avatar.outfit.sweater` | `'sweater-cream'` | **Sweater Kem Thu-Đông** | Áo nỉ cổ tròn dài tay màu kem ấm (`#EDE6D6`) thuộc bộ sưu tập Thu-Đông HUST, bo cổ/tay/gấu dệt nổi và logo `HUST` đỏ trước ngực. |

---

## 3. Module `avatar.accessory.skirt` & Phụ kiện Cá nhân

- **Module ID:** `avatar.accessory.skirt` (cùng `glasses`, `backpack`, `lanyard`)
- **Purpose:** Hỗ trợ tùy biến trang phục nữ sinh viên Bách khoa với chân váy xếp ly chữ A và các phụ kiện học tập.
- **Invariants:**
  1. **Chân váy xếp ly chữ A (`skirt: boolean`):**
     - Dành cho nhân vật Nữ (`gender === 'female'`). Khi bật `skirt = true`, phần thân dưới dựng hình nón cụt xếp 12 nếp gấp ly (`pleats`) quanh hông kết hợp quần bảo hộ bên trong để không hở khi di chuyển.
     - Tự động phối màu chân váy trắng kem khi mặc `tshirt-navy` (đúng ảnh `ao-phong-xanh-nu-01.jpg`) và chân váy đen than khi mặc các mẫu áo khác; người chơi có thể bật/tắt tự do giữa **Chân váy xếp ly** và **Quần dài** trong `CharacterCreatorModal`.
  2. **Ràng buộc NPC Cốt truyện:**
     - NPC **Minh** tại Cổng Parabol luôn cố định ngoại hình: `hoodie` màu xanh tím than (`NAVY`), mũ trùm đỏ, quần kaki và balo xám (tuyệt đối không đổi áo Minh sang đỏ hay xanh lá).
     - NPC **Cô giáo** trong Phòng học luôn cố định: áo `shirt` trắng, kính gọng tròn và tóc búi (`bun`).
- **Acceptance Criteria:**
  - Mọi thay đổi về `gender`, `outfit`, `hairStyle`, `skirt`, `glasses`, `backpack` được lưu vào `localStorage` (`bkhn-character-v1`) và phát sóng tức thì qua gói tin WebSocket `appearance` tới các người chơi khác trong phòng.
- **Known Limitations:**
  - Khi nhân vật Nữ mặc chân váy xếp ly và ngồi lên xe máy, hình học chân váy giữ form chữ A quanh đùi thay vì mô phỏng vải mềm (cloth physics) để đảm bảo hiệu năng 60 FPS.
