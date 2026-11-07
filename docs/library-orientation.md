# Hướng thư viện Tạ Quang Bửu — quyết định phân tích (giai đoạn A, 06/11/2026)

> Chỉ phân tích, KHÔNG sửa code. Mọi số dưới đây để luồng triển khai (giai đoạn B)
> áp dụng; file này là căn cứ duy nhất cho hướng mới, thay thế cách hiểu cũ trong
> `docs/satellite-and-c9.md` §2 và comment trong `LibraryBuilding.tsx` / `campus.ts`.

## 0. Kết luận chốt (đọc trước)

**Mặt đồng hồ + sảnh chính xoay từ hướng TÂY (-X, ra Hồ Tiền) sang hướng NAM
của scene (+Z)** — tức quay mặt về sân phía nam của tòa nhà, nơi hiện có đảo cỏ
tròn và cây lộc vừng. **Không xoay 180° (đông), không di chuyển hồ, không sao
chép mặt đồng hồ sang nhiều phía.**

- Góc xoay: **+90° quanh trục Y** (`rotation.y = +π/2` theo quy ước three.js),
  quanh **tâm tòa nhà (38, 32)** — vị trí không đổi, chỉ đổi hướng.
- Đồng hồ mới: **(38, 9.6, 44.1)**, mặt quay về **+Z (nam)**.
- Footprint AABB mới (khối + mái hiên): **x 29,5..46,5, z 19,9..47,4**.
- Sân vào mới: mở rộng `LIBRARY.plaza` thành **x 23..50, z 18..56**
  (giữ nguyên 3 cạnh cũ, chỉ nới `maxZ` 48 → 56); sân trước cửa
  (forecourt) là dải **x 23..50, z 48..56**.
- Collider mới: **`{ minX: 29.5, maxX: 46.5, minZ: 19.4, maxZ: 44.5 }`**
  (khối xây, chưa tính mái hiên — xem §6).
- Leg3, leg4 và cả 4 đường đi **không cần đổi điểm nào** (xem §7).
- Ảnh kiểm chứng: `test-shots/library-topdown-annotated.png`
  (top-view thật từ `out/` hiện có + đánh dấu).

Quy ước hướng trong file này là hướng **của scene** theo `lib/campus.ts`:
+X = đông, -X = tây, -Z = bắc, +Z = nam. **Không khẳng định phương vị la bàn
thật** của mặt đồng hồ ngoài đời (xem §8 — chưa xác minh).

---

## 1. Hướng HIỆN TẠI (đã xác minh bằng code + ảnh chụp thật)

### 1.1. Code

| Thành phần | Hiện tại |
|---|---|
| Mặt đồng hồ | Trên mặt tây của khối đế (khối đế x 26..30,98, z 23,5..40,5), tâm **(25,9, 9,6, 32)**, bán kính 2,2 m — `LIBRARY.clock`, `lib/campus.ts:80` |
| Pháp tuyến mặt đồng hồ | **-X (tây)** — mesh `rotation-y={-Math.PI / 2}` (`LibraryBuilding.tsx:232`); kim đồng hồ lùi 0,08 m về phía đông của mặt |
| Hai cụm lam | x ≈ 25,8..25,96, tâm z = 27 và z = 37, hai bên đồng hồ |
| Biển tên `THƯ VIỆN TẠ QUANG BỬU` | (25,93, 12,55, 32), cùng mặt tây |
| Sảnh | Mái hiên x 22,6..26, z 27..37; 4 cột x = 23,2; cửa kính lùi ở x = 27,44, z = 30/32/34; bậc x 24,9..26 — tất cả mở về **tây** |
| Khối cao chính | x 31..50, z 24..34 (10 tầng); khối bên x 31..47, z 34..40 (5 tầng); dải kính đứng x ≈ 30,9, z 33,3..34,7 |
| AABB thực tế | Khối xây x 26..50,1, z 23,5..40,5; cộng mái hiên/cột/bậc: **x 22,6..50,1, z 23,5..40,5** |
| Collider `Thư viện Tạ Quang Bửu` | `{ minX: 26, maxX: 50, minZ: 23, maxZ: 41 }` (`lib/campus.ts`) |
| Sân `LIBRARY.plaza` | `{ minX: 23, maxX: 50, minZ: 18, maxZ: 48 }` — gạch đỏ-nâu, vẽ ở `Ground.tsx` |

### 1.2. Quan hệ với Hồ Tiền

- Hồ Tiền: tâm (-2, 40), x -24,5..20,5, z -4..84 (hình chữ nhật bắc–nam).
- Mặt đồng hồ cách mép đông của hồ (x = 20,5) chỉ **5,4 m** theo đường thẳng
  tây–đông, giữa hai bên là bờ kè đông (x 19,9..21,1) và đường ven hồ (x = 24).
- Nghĩa là: đứng ở bờ đông hồ nhìn sang là thấy **trực diện toàn bộ mặt tiền
  có đồng hồ** — đúng như ảnh hiện trạng user gửi 06/11.

### 1.3. Ảnh chụp thật (bản `out/` hiện có, 06/11/2026)

- **Top-view** (`window.__bkhn.topView()`, camera (0, 160, 5.01) nhìn xuống
  (0, 0, 5); bắc lên trên, đông sang phải — đã đối chiếu khung hồ thật với
  tọa độ: tỉ lệ 4,8 px/m, tâm ảnh (640, 400) ↔ world (0, 5)):
  thư viện nằm ngay phía đông hồ, khối trắng + sân đỏ-nâu bao quanh, mặt tây
  của khối đế áp sát đường ven hồ x = 24.
- **Ảnh mắt thường từ bờ hồ** (avatar (-28, 32), nhìn đông, dist 10 m):
  thấy trực diện mặt tiền — đồng hồ, hai cụm lam, biển tên, sảnh và cửa kính
  — ngay bên kia hồ, sau hàng hoa súng. Đây chính là lỗi cần sửa.
  (Ảnh gốc lưu tại `/tmp/lib-orientation-shots/topview.png` và
  `/tmp/lib-orientation-shots/library-west-from-lake.png` — file tạm, không
  đưa vào repo.)

### 1.4. Nguồn gốc lỗi

`docs/satellite-and-c9.md` §2 ghi "mặt tây hướng ra hồ". Câu này chỉ đúng ở
mức **phía tây của TÒA NHÀ hướng ra hồ** (thư viện nằm phía đông hồ, cách hồ
một đường nội bộ — đúng theo vệ tinh). Nó **không** có nghĩa mặt đồng hồ nằm
ở mặt tây. Cách hiểu sai đó đã được đưa thành comment khẳng định trong
`LibraryBuilding.tsx:16` ("Mặt chính hướng TÂY (ra Hồ Tiền)") và
`lib/campus.ts:74` ("mặt tây hướng ra hồ"), rồi dựng toàn bộ mặt tiền theo đó.
**Đính chính của chủ dự án 06/11 phủ định cách hiểu này: mặt có đồng hồ KHÔNG
quay ra Hồ Tiền.** Các comment đó phải được sửa ở giai đoạn B (xem §6.4).

---

## 2. Bằng chứng từ ảnh tham chiếu (chỉ xem, không copy vào project)

Hai ảnh đã tải về `/tmp` (`lib-oblique.jpg`, `lib-front.jpg`) và xem trực tiếp.

### 2.1. Ảnh xiên (660×438, library.hust.edu.vn)

- **Khối bên / dải kính đứng nằm phía nào của mặt đồng hồ?**
  Mặt đồng hồ ở giữa–trái khung hình, hai cụm lam ngang nằm **hai bên**
  đồng hồ. Khối tháp cao màu trắng với các hàng cửa sổ đều dựng **phía sau /
  phía trên** mặt đồng hồ. **Phía phải khung hình** (nhìn từ mặt tiền) là
  một khối bên thấp hơn, lùi sâu, có dải kính đứng ở chỗ chuyển tiếp với
  khối cao — đúng vị trí tương đối khối bên ↔ khối cao trong model hiện tại
  khi nhìn từ mặt tiền (khối bên ở phía phải mặt đồng hồ).
- **Xung quanh mặt chính có gì?** Sân/đường lát rộng ngay trước mặt tiền,
  hàng cau/cọ cao trước sảnh, bụi cây, cột đèn đường, xe hơi đỗ dọc mép
  đường phía phải, cây lớn hai bên; xa phía trái nền có một tòa nhà vàng.
- **Có thấy hồ không? Không.** Không có mặt nước nào trong ảnh.
  Trước mặt tiền là đường/sân và cây — không phải bờ nước.

### 2.2. Ảnh "chính diện" — LƯU Ý: đây là ẢNH GHÉP (collage), không phải một ảnh

File `2. Thư viện.jpg` (1200×675) gồm hàng trên 4 ô chéo + hàng dưới là
nội thất giếng trời và ô nâu ghi "Tòa nhà Thư viện". **Không được dùng file
này như một ảnh chính diện duy nhất.** Ô thứ 4 (phải nhất, hàng trên) mới là
ảnh mặt tiền thật:

- Đồng hồ ở giữa, hai cụm lam hai bên, biển tên phía trên đồng hồ, sảnh thụt
  sâu với cửa kính, biển đỏ "HUST" đặt đất trước cửa.
- Trước mặt tiền là **đường rộng có vạch vàng giữa đường**, hai bên có cây
  lộc vừng lá đỏ và cau; **không thấy hồ**.
- Hai ô đầu hàng trên chỉ thấy cây lộc vừng lá đỏ và một góc tòa nhà — cho
  thấy cây lá đỏ đứng **trước / quanh mặt tiền**, khớp `reference-visual.md`
  §3 ("trước nhà có cây lộc vừng lá đỏ").

### 2.3. Bằng chứng trong scene (quyết định hướng mới — xem §3)

- `reference-visual.md` §3: "Quảng trường **trước thư viện**: lát gạch
  đỏ-nâu, **có đảo cỏ tròn với cây xanh**". Đảo cỏ trong scene ở **(32, 43)**
  — phía **nam** của tòa nhà (z = 43 > mép nam khối xây z = 40,5).
- Cây lộc vừng lá đỏ ở **(47, 44)** — cũng phía **nam**.
- Cả hai vật "trước nhà" đều nằm ở dải sân phía nam, không vật nào nằm ở
  dải phía bắc hay phía đông.

---

## 3. Hướng MỚI đã chốt + lý lẽ từng bước

### 3.1. Chốt

**Mặt đồng hồ + sảnh chính hướng về NAM của scene (+Z), ra sân phía nam
của tòa nhà.** Toàn bộ công trình xoay +90° quanh tâm (38, 32); hồ giữ
nguyên; không thêm mặt đồng hồ thứ hai ở bất cứ phía nào.

### 3.2. Lý lẽ (theo thứ tự)

1. **Sân tiếp cận được xác định từ cấu trúc scene, không đoán.**
   `LIBRARY.plaza` (x 23..50, z 18..48) bao quanh tòa nhà 4 phía, nhưng độ
   sâu thực tế rất khác nhau: tây chỉ 3 m (x 23..26 — thực chất là hành
   lang đường ven hồ, không phải sân), bắc 5,5 m (z 18..23,5), **nam 7,5 m
   (z 40,5..48)**, đông 0 m (plaza kết thúc đúng mép đông tòa nhà x = 50).
   Dải sân duy nhất đủ sâu để làm sân trước cửa là **dải nam**.
2. **Hai vật "trước nhà" đều ở phía nam** (§2.3): đảo cỏ tròn (32, 43) và
   cây lộc vừng lá đỏ (47, 44). Theo `reference-visual.md` §3, đảo cỏ nằm
   trong quảng trường **trước** thư viện. Nếu mặt chính quay hướng khác,
   cả hai vật này sẽ nằm **sau lưng** tòa nhà — mâu thuẫn trực tiếp với
   tài liệu tham chiếu. Đây là bằng chứng trong-scene mạnh nhất cho
   hướng nam.
3. **Luồng giao thông đưa người tới góc tây-nam của sân nam.**
   Đường C1–Thư viện kết thúc ở (24, 28); đường Thư viện–Hồ Tiền chạy tiếp
   (24, 28) → (24, 46) và dừng ở z = 46 — tức **ngang tầm dải sân nam**,
   góc tây-nam của sân. Người đi hết đường này chỉ cần rẽ đông là vào sân
   trước cửa mới. Leg4 kết thúc (23, 46) cũng đúng điểm này (xem §7).
4. **Ảnh tham chiếu không có hồ, có đường/sân + cây trước mặt tiền**
   (§2.1–2.2). Mặt tiền mới nhìn ra sân gạch đỏ-nâu + đảo cỏ + cây — khớp;
   mặt tiền cũ nhìn ra hồ — không khớp với bất cứ ảnh nào.
5. **Không xoay 180° (đông).** Phía đông không có sân (plaza hết ở x = 50),
   không có đường, không có vật "trước nhà" nào; chỉ có cỏ trống tới tận
   quảng trường Trần Đại Nghĩa (x 72..92, z -18..6, lệch hẳn về bắc). Không
   có bằng chứng nào cho hướng đông, và brief cấm mặc định xoay 180°.
6. **Không quay hướng bắc (-Z).** Dải bắc chỉ sâu 5,5 m; mái hiên mới sẽ
   nhô tới z ≈ 16,6, **vượt khỏi plaza** (minZ = 18) và phải nới sân về
   phía bắc — nơi không có đường nào đưa tới (đường C1–Thư viện chạy dọc
   x = 24, không rẽ vào phía bắc tòa nhà). Quan trọng hơn: đảo cỏ + lộc
   vừng sẽ nằm sau lưng tòa nhà (mâu thuẫn §3.2 bước 2).
7. **Không di chuyển hồ, không sao chép mặt đồng hồ** — theo brief và
   đính chính; mặt nhìn từ hồ sẽ là mặt bên (xem §5).

---

## 4. Góc xoay chính xác + công thức biến đổi

- **Góc xoay: +90° quanh trục Y** (trong three.js: `rotation.y = +Math.PI / 2`),
  quanh **tâm tòa nhà (38, 32)** — tâm `LIBRARY.center`, giữ nguyên vị trí.
- Công thức cho mọi điểm (x, z) của tòa nhà:
  `(x, z) → (38 + (z − 32), 32 − (x − 38))`
  và mọi mesh `rotation-y` cộng thêm `+π/2` (mod 2π). Kiểm chứng: pháp tuyến
  mặt đồng hồ cũ -X → +Z (nam) ✓; điểm đồng hồ (25,9, 32) → (38, 44,1) ✓.
- Chỉ xoay **công trình thư viện** (`LibraryBuilding.tsx` + các hằng số
  `LIBRARY` liên quan trong `campus.ts`); không xoay hồ, đường, C1, C9 hay
  toàn bộ campus.

---

## 5. Hình học MỚI (đã tính bằng công thức §4, làm tròn 2 chữ số)

### 5.1. Footprint AABB mới

| Thành phần | Mới (x .., z ..) |
|---|---|
| Khối xây (tổng) | **x 29,5..46,5, z 19,9..44** |
| Khối đế (mang đồng hồ/lam/biển) | x 29,5..46,5, **z 39,02..44** (thành dải nam của tòa nhà) |
| Khối cao chính (10 tầng) | x 30..40, z 20..39 |
| Khối bên (5 tầng) | x 40..46, z 23..39 |
| Mái hiên + cột + bậc | **x 33..43, z 44..47,4** (nhô về nam) |
| **AABB tổng (khối + mái hiên)** | **x 29,5..46,5, z 19,9..47,4** |

`LIBRARY.size` đổi từ `{ x: 24, z: 18 }` thành `{ x: 17, z: 24 }`
(khối xây 17 × 24,1 m; cộng mái hiên z tới 47,4). `LIBRARY.center` giữ
(38, 32). `ZONES` "Thư viện Tạ Quang Bửu" giữ tâm (38, 32), bán kính 20 —
góc xa nhất của footprint mới cách tâm 17,6 m nên vẫn bao vừa.

### 5.2. Vị trí đồng hồ + mặt tiền mới

| Thành phần | Mới |
|---|---|
| Đồng hồ | **(38, 9,6, 44,1)**, y và bán kính (2,2 m) giữ nguyên; mặt quay về **+Z (nam)** — mesh `rotation-y` từ `-π/2` thành `0` (mặt `circleGeometry` mặc định nhìn +Z) |
| Hai cụm lam | **(33, 9,25, 44,1)** và **(43, 9,25, 44,1)**, hai bên đồng hồ |
| Biển tên | **(38, 12,55, 44,07)**, `rotation` từ `[0, -π/2, 0]` thành `[0, 0, 0]` |
| Cửa kính (3 cánh) | x = 36 / 38 / 40, z = **42,56** (lùi 1,44 m sau mặt đế z = 44, như cũ) |
| Mái hiên | x 33..43, z 44..47,4, y = 6,8 |
| 4 cột hiên | x = 34,9 / 36,9 / 39,1 / 41,1, z = **46,8** |
| Bậc (2 cấp) | x 33..43, z 44..45,1 |
| Dải kính đứng | x 39,3..40,7, **z = 39,1**, y 13,2..28,8 — nằm trên mặt nam của khối cao, phía trên mái khối đế (khối đế cao 13,2 m), tại chỗ chuyển tiếp khối cao/khối bên; vẫn là chi tiết nhận diện của mặt nam, không phải mặt tây |

### 5.3. Mặt nhìn từ hồ (mặt tây mới) — KHÔNG phải bản sao mặt tiền

Sau khi xoay, mặt tây (phẳng x = 29,5, z 19,9..44) gồm:

- **z 20..39:** mặt tây khối cao — các **dải cửa sổ ngang đều 9 tầng**
  (mặt bắc cũ của tháp) + dải cửa sổ tầng 10 có cột.
- **z 39..44:** đầu tây trắng của khối đế, có một dải kính nhỏ
  (29,44, 9, 41,5) — mặt bên kín đáo, đúng tính chất mặt hông.
- **Không có** đồng hồ, lam, biển tên hay sảnh ở mặt này.
- Mặt tây mới cách bờ kè đông của hồ (x = 21,1) **8,4 m** (trước đây mặt đế
  cách 4,9 m) — khoảng lùi này là hành lang đường ven hồ + vỉa hè, không
  còn cảm giác mặt tiền áp sát mặt nước.

---

## 6. Thay đổi cần làm ở giai đoạn B (chỉ liệt kê — KHÔNG làm ở đây)

### 6.1. `lib/campus.ts`

```ts
LIBRARY = {
  center: { x: 38, z: 32 },        // GIỮ NGUYÊN
  size: { x: 17, z: 24 },          // đổi từ { x: 24, z: 18 }
  floors: 10, floorHeight: 3.2,   // GIỮ NGUYÊN
  clock: { x: 38, y: 9.6, z: 44.1, radius: 2.2 },  // đổi x 25,9 → 38, z 32 → 44,1
  plaza: { minX: 23, maxX: 50, minZ: 18, maxZ: 56 }, // chỉ nới maxZ 48 → 56
}
```

### 6.2. Collider mới (`BUILDING_COLLIDERS`, `lib/campus.ts`)

```ts
{ name: 'Thư viện Tạ Quang Bửu', box: { minX: 29.5, maxX: 46.5, minZ: 19.4, maxZ: 44.5 } }
```

- Theo đúng quy ước cũ: bó sát theo x (khối xây), nới 0,5 m mỗi bên theo z
  (collider cũ 23..41 so với khối 23,5..40,5). Mái hiên (z 44..47,4) ở
  **ngoài** collider như cũ (mái hiên cũ x 22,6..26 cũng ngoài collider) để
  avatar đứng được dưới mái trước cửa.
- Hệ quả cần kiểm tra ở giai đoạn B: avatar áp sát từ phía nam dừng ở
  z ≈ 44,9 (cách mặt cửa kính z = 42,56 khoảng 2,3 m; trước đây 1,84 m).
  Hiện **chưa có trigger tương tác nào gắn cửa thư viện** trong
  `app/page.tsx` (NPC Minh ở cổng Parabol), nên chưa có gì hỏng — nhưng khi
  nào thêm tương tác cửa thư viện thì phải kiểm tra bán kính tương tác
  ≥ 2,5 m. Cột hiên (4 cột mảnh ở z = 46,8) hiện cũng không có collider
  riêng — giữ như cũ (không thêm), trừ khi test thấy avatar đi xuyên cột
  gây khó chịu.
- Minimap (`components/ui/Minimap.tsx`) vẽ từ `BUILDING_COLLIDERS` nên tự
  cập nhật theo collider mới, không cần sửa riêng.

### 6.3. `components/three/LibraryBuilding.tsx`

- Áp dụng công thức §4 cho mọi tọa độ tuyệt đối của tòa nhà (xoay quanh
  (38, 32)); `rotation-y` các mesh cộng `+π/2`.
- **Đảo cỏ tròn (32, 43) r = 3 m sẽ nằm TRONG footprint khối đế mới**
  (x 29,5..46,5, z 39,02..44) — bắt buộc phải dời. Đề xuất (chưa chốt,
  để giai đoạn B quyết cùng user): dời ra giữa sân vào mới, trên trục cửa
  **(38, 52)**.
- **Hàng cau (22,5, 25,5) và (23, 38,5)** hiện kẹp hai bên lối vào tây —
  sau xoay sẽ đứng trơ giữa đường ven hồ. Đề xuất: dời kẹp hai bên lối vào
  mới **(33, 48,5)** và **(43, 48,5)** (ngay mép nam mái hiên).
- **Cây lộc vừng (47, 44)**: cách mép đông mới của tòa nhà chỉ 0,5 m, đứng
  ở góc đông-nam, sát mặt đế — không còn ở "trước nhà". Đề xuất: giữ làm
  cây góc đông-nam, hoặc dời ra **(47, 52)** để kẹp phía đông sân vào.
  Cả ba đề xuất dời cây/cỏ trên chỉ là phương án để giai đoạn B cân nhắc,
  không phải quyết định đã chốt.
- `LIBRARY.center.z` đang được dùng làm z tâm cho mái hiên/bậc/biển tên
  (`LibraryBuilding.tsx:262, 272, 283, 287`); sau xoay các chi tiết đó căn
  theo `LIBRARY.center.x` — sửa theo công thức §4, không giữ nguyên.

### 6.4. Comment + ánh sáng cần sửa theo (giai đoạn B)

- `LibraryBuilding.tsx:16` ("Mặt chính hướng TÂY (ra Hồ Tiền)") và
  `lib/campus.ts:74` ("mặt tây hướng ra hồ") — sửa theo hướng mới; ghi rõ
  đính chính 06/11 để không ai "sửa lại" theo vệ tinh.
- `CampusScene.tsx`: đèn fill từ phía tây được chú thích là để nâng mặt
  đồng hồ hướng ra hồ — sau xoay, mặt đồng hồ hướng nam; kiểm tra lại
  hướng đèn chính/fill và bóng đổ ở giai đoạn B (không đổi vội trong
  giai đoạn A).
- Brief §2 (thu nhỏ đồng hồ, sửa tỉ lệ mặt tiền/lam/sảnh) là việc riêng,
  làm SAU khi chốt hướng — không gộp vào quyết định này.

---

## 7. Ảnh hưởng tới đường đi và các chặng kiểm tra (leg)

**Không đổi bất cứ điểm đường hay waypoint nào.** Kiểm tra từng điểm với
collider mới (x 29,5..46,5, z 19,9..44):

| Đường / leg | Điểm | Kết quả |
|---|---|---|
| Đường C1–Thư viện | (-58,-34) → (24,-20) → **(24, 28)** | Điểm cuối (24, 28) cách mặt tây mới (x = 29,5) 5,5 m, đi được bình thường |
| Đường Thư viện–Hồ Tiền | (24, 28) → **(24, 46)** | Nằm trên đường ven hồ, ngoài footprint mới; điểm cuối (24, 46) đứng ngay sát góc tây-nam của sân vào mới (cách mép bắc sân vào z = 48 chỉ 2 m) — hợp lý hơn trước |
| Đường chính Parabol–C9–C1, Đường tình yêu | — | Không chạm khu vực thư viện, không ảnh hưởng |
| **leg3** Quảng trường C1 → Thư viện, kết thúc **(24, 28)** | (24, 28) | **Đi được**, ngoài collider mới; không đổi |
| **leg4** Thư viện → Bờ Hồ Tiền: (24, 28) → (24, 40) → **(23, 46)** | cả 3 điểm | **Đi được**, tất cả đều ở x = 23..24 (tây của footprint mới); điểm cuối (23, 46) nay đứng đúng mép tây của lối vào sân mới (thẳng hàng với mép tây sân vào x = 23, cách mép bắc sân vào z = 48 chỉ 2 m) thay vì cụt đường — nên giữ nguyên, không cần dời đích |
| leg1, leg2 | — | Không chạm khu vực thư viện, không ảnh hưởng |

Lưu ý: sau khi xoay, **đích leg3 (24, 28) không còn là "trước cửa thư viện"**
nữa mà là điểm trên đường ven hồ, cách cửa mới (38, ~45) khoảng 23 m đi bộ
qua sân nam. Đó là đúng thực tế (đường chính tới thư viện vốn đi vòng đông
hồ rồi vào sân), không phải lỗi — nhưng ở giai đoạn B nên kiểm tra lại bằng
leg-sim rằng avatar đi từ (24, 28) vào tới cửa (38, 46) không bị đảo cỏ mới
hay cột hiên chặn (đảo cỏ đề xuất dời tới (38, 52) nằm trên trục cửa nhưng
ngoài lối đi thẳng từ tây sang; cột hiên không có collider).

---

## 8. Những gì VẪN CHƯA xác minh được

1. **Phương vị la bàn thật của mặt đồng hồ ngoài đời.** Quyết định này chỉ
   dùng hướng tương đối trong scene (+Z = "nam" theo quy ước `campus.ts`).
   Chưa có dữ liệu nào (bản đồ có la bàn, ảnh vệ tinh kèm hướng mặt tiền,
   hay ảnh chụp từ sân trước có định vị) chứng minh mặt đồng hồ thật quay
   về hướng la bàn nào. **Không được ghi vào tài liệu/code rằng "mặt đồng
   hồ quay về hướng nam thật"** — chỉ nói "về phía sân phía nam của scene".
2. **Sân trước mặt tiền thật là đường hay sân gạch?** Ảnh chính diện cho
   thấy đường rộng có vạch vàng trước mặt tiền; trong scene, phía nam thư
   viện không có đường đông–tây, chỉ có sân gạch đỏ-nâu. Quyết định này
   chọn sân gạch hiện có làm sân tiếp cận; có nên vẽ thêm đường đông–tây
   trước sân nam hay không là câu hỏi cho chủ dự án, không tự thêm.
3. **Vị trí thật của đảo cỏ tròn so với mặt tiền.** Chỉ biết đảo cỏ nằm
   trong quảng trường trước thư viện (`reference-visual.md` §3); vị trí
   đề xuất (38, 52) là ước lượng theo trục cửa, chưa đối chiếu ảnh thật.
4. **Khối bên nằm phía nào của tháp khi nhìn từ mặt tiền thật.** Ảnh xiên
   cho thấy khối bên ở phía phải mặt đồng hồ; phép xoay nam giữ đúng quan
   hệ này (khối bên mới ở x 40..46, tức phía đông; nhìn từ nam, đông ở
   phía phải). Nhưng ảnh xiên không ghi rõ nó được chụp từ phía nào của
   tòa nhà, nên quan hệ trái/phải này mới ở mức "khớp với ảnh đã xem",
   chưa phải đã khóa bằng vệ tinh.
5. **Kích thước/tỉ lệ thật của đồng hồ và cụm lam.** Giữ nguyên y = 9,6,
   r = 2,2 m theo code hiện tại; brief §2 yêu cầu thu nhỏ đồng hồ tương
   quan với mặt đứng — đó là việc của bước sửa tỉ lệ, chưa làm ở đây.
6. **Ánh sáng/bóng đổ sau khi xoay.** Đèn fill phía tây trong
   `CampusScene.tsx` được chỉnh cho mặt tây; mặt nam mới có thể bị tối
   hoặc chói khác — cần kiểm tra bằng ảnh render ở giai đoạn B, không kết
   luận trước.
7. **Ảnh vệ tinh không đủ phân giải** để đọc hướng mặt tiền (chỉ khóa được
   vị trí tương đối thư viện–hồ–C1–cổng Parabol, như `satellite-and-c9.md`
   đã ghi). Mọi khẳng định hướng trong file này đều dựa trên ảnh mặt đất
   + cấu trúc scene, không dựa trên vệ tinh.

---

## 9. Tài liệu tham khảo cho quyết định này

- `docs/rework-round2-brief.md` §1 (đính chính bắt buộc 06/11) và §9
  (thứ tự sửa: hướng thư viện là bước 1).
- `docs/satellite-and-c9.md` §2 — **đã đính chính**: "mặt tây hướng ra hồ"
  chỉ là phía tây tòa nhà hướng ra hồ, không phải vị trí mặt đồng hồ.
- `docs/reference-visual.md` §3 — đảo cỏ trong quảng trường trước thư viện;
  đồng hồ thấp ngay trên mái hiên; hàng cau hai bên lối vào; lộc vừng lá đỏ
  trước nhà.
- Ảnh tham chiếu (chỉ xem, `/tmp/lib-oblique.jpg`, `/tmp/lib-front.jpg` —
  không copy vào project; ảnh "chính diện" là collage, xem §2.2).
- Ảnh kiểm chứng: `test-shots/library-topdown-annotated.png`
  (top-view thật từ `out/` hiện có 06/11 + đánh dấu hồ / thư viện /
  mặt đồng hồ hiện tại / sân vào / mũi tên hướng mặt chính mới);
  ảnh gốc chưa đánh dấu: `/tmp/lib-orientation-shots/topview.png`.
- Code đối chiếu: `lib/campus.ts` (`LIBRARY`, `LAKE`, `ROADS`, `LEGS`,
  `BUILDING_COLLIDERS`), `components/three/LibraryBuilding.tsx` (đầu file +
  các khối + AABB thực tế), `components/three/Player.tsx` (`topView()`:
  camera (0, 160, 5.01) nhìn (0, 0, 5)).
