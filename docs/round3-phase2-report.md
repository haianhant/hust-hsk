# Báo cáo đợt 3 — Giai đoạn 2: Xoay thư viện 180° (06/11/2026)

> Chỉ làm giai đoạn 2 của `docs/round3-brief.md` §2. Không đụng giai đoạn 1
> (nhân vật) và giai đoạn 3 (cây) — chạy song song trên file khác.

## 0. Kết quả chốt (đọc trước)

**Sau xoay, mặt đồng hồ nhìn về phía BẮC của scene (−Z)** — tức ra sân trước
cửa mới phía bắc của tòa nhà. (Chỉ nói hướng trong scene theo quy ước
`lib/campus.ts`: +X đông, −X tây, −Z bắc, +Z nam; **không** khẳng định
phương vị la bàn thật ngoài đời.)

| Hạng mục | Trước (đợt 2) | Sau (đợt 3 giai đoạn 2) |
|---|---|---|
| Đồng hồ | (38, 9,6, 44,1), mặt +Z (nam) | **(38, 9,6, 19,9), mặt −Z (bắc)** |
| Sảnh / mái hiên | z 44..47,4 | **z 16,6..20** |
| Cột hiên (4 cột) | z 46,8 | **z 17,2** |
| Cửa kính (3 cánh) | z 42,56 | **z 21,44** |
| Bậc (2 cấp) | z 44..45,1 | **z 18,9..20** |
| Tháp (10 tầng) | x 30..40, z 20..39 | **x 36..46, z 25..44** |
| Khối bên (5 tầng) | x 40..46, z 23..39 | **x 30..36, z 25..39** |
| Khối đế | x 29,5..46,5, z 39,02..44 | **x 29,5..46,5, z 20..25** |
| Biển tên | (38, 12,55, 44,07) | **(38, 12,55, 19,93)** |
| Hàng cau kẹp lối vào | (33/43, 48,5) | **(33/43, 15,5)** |
| Đảo cỏ / lộc vừng | (30, 52) / (49, 52) | **giữ nguyên** — nay là sân sau |

Chỉ có **một** mặt đồng hồ (mặt bắc mới). Mặt nam mới (nhìn từ sân nam cũ)
là mặt sau: dải cửa sổ ngang của tháp + khối bên, không đồng hồ/lam/biển/
sảnh — xem `r3-lib-south-from-yard.png`. Mặt tây mới (nhìn từ hồ) cũng
không có đồng hồ — xem `r3-lib-west-from-lake.png`.

## 1. Đã xoay như thế nào

Công thức xoay 180° quanh trục đứng Y, quanh tâm/pivot của chính thư viện
(38, 32), giữ vị trí công trình:

```
(x, z) → (76 − x, 64 − z); mọi rotation-y cộng thêm π
```

Cách thực hiện — **một group xoay duy nhất** trong
`components/three/LibraryBuilding.tsx` (không viết lại từng tọa độ, không
cộng thêm 180° mỗi lần tải/dựng):

```tsx
<group position={[76, 0, 64]} rotation-y={Math.PI}>
  {/* toàn bộ CÔNG TRÌNH: tháp, khối bên, khối đế, lam, đồng hồ,
      biển tên, sảnh, bậc, cửa — tọa độ bên trong giữ nguyên số cũ */}
</group>
{/* SÂN (đảo cỏ, lộc vừng, cau) ở NGOÀI group — không xoay theo nhà */}
```

- Group này ánh xạ cục bộ (x, z) → thế giới (76 − x, 64 − z); pivot đúng
  tâm (38, 32) nên nhà không chạy chỗ. Kiểm chứng bằng ảnh: footprint trên
  top-down khớp đúng hộp x 29,5..46,5, z 20..44,1.
- Đồng hồ/biển tên dùng `LIBRARY.clock` (tọa độ thế giới mới) nên phải đổi
  ngược về tọa độ cục bộ trong group: `clockLocal = (76 − x, y, 64 − z)` =
  (38, 9,6, 44,1); biển tên cục bộ (38, 12,55, 44,07). Kim đồng hồ lùi
  0,08 m về phía bắc của mặt (cục bộ +Z trước khi xoay).
- Sân không xoay theo nhà: đảo cỏ (30, 52) + lộc vừng (49, 52) giữ ở sân
  nam (nay là sân sau). Riêng hàng cau kẹp lối vào dời từ (33/43, 48,5)
  sang kẹp lối vào mới phía bắc (33/43, 15,5), ngay trước mái hiên mới.
- Không xoay hồ/campus; không tạo mặt đồng hồ thứ hai.

## 2. Cập nhật đồng bộ (`lib/campus.ts` + đèn + đường)

### 2.1. `LIBRARY` (`lib/campus.ts`)

```ts
clock: { x: 38, y: 9.6, z: 19.9, radius: 1.6 }   // cũ (38, 9,6, 44,1)
plaza: { minX: 23, maxX: 50, minZ: 14, maxZ: 56 } // cũ minZ 18 → 14:
  // nới về phía bắc làm sân trước cửa mới (mái hiên z 16,6..20, cột z 17,2);
  // giữ phía nam như cũ
size: { x: 17, z: 24 } // giữ nguyên (khối xây thực 17 × 24,1 m)
```

### 2.2. Collider thư viện — tính lại theo footprint đã xoay

Khối xây mới: x 29,5..46,5, z 20..44,1 (đối xứng gần như giữ nguyên qua
z = 32: cũ z 19,9..44 → mới z 20..44,1). Theo đúng quy ước cũ (bó sát theo
x, nới 0,5 m mỗi bên theo z):

```ts
{ name: 'Thư viện Tạ Quang Bửu',
  box: { minX: 29.5, maxX: 46.5, minZ: 19.5, maxZ: 44.6 } } // cũ 19,4..44,5
```

Mái hiên mới (z 16,6..20) nằm ngoài collider như cũ, để avatar đứng được
dưới mái trước cửa. Avatar áp sát từ phía bắc dừng ở z ≈ 19,1, cách cửa
kính (z 21,44) ~2,3 m — tương đương trước đây (2,3 m từ phía nam).

### 2.3. Đường tiếp cận sảnh mới (`ROADS`, `lib/campus.ts`)

Sảnh mới ở (38, ~17–20); đường cũ kết thúc (24, 28) nằm phía tây-nam sân.
Phương án đã chọn: **nới plaza + kéo đường x = 24 lên phía bắc** (không vẽ
thêm đường đông–tây — đoạn đó nằm trong plaza, sàn plaza chính là mặt đi):

- Đường C1 – Thư viện: điểm cuối (24, 28) → **(24, 18)** — chạm mép bắc
  sân trước cửa mới (plaza minZ 14); từ đây đi bộ qua sân vào sảnh.
- Đường Thư viện – Hồ Tiền: đầu đường (24, 28) → **(24, 18)** — đoạn
  x = 24 chạy dọc bờ đông hồ, ngoài footprint thư viện mới, nối liền mạch
  với đường C1 – Thư viện.
- `LEGS` giữ nguyên: leg3 kết thúc (24, 28) vẫn đi được (điểm này nằm
  trong plaza, ngoài collider mới); leg4 (24, 28) → (24, 40) → (23, 46)
  vẫn đi được, toàn bộ ở phía tây footprint mới.
- `Ground.tsx` **không cần sửa code**: plaza và đường đều vẽ từ
  `LIBRARY.plaza` / `ROADS` nên tự theo số mới (đã kiểm bằng ảnh top-down:
  sân đỏ-nâu nới tới z = 14, đường x = 24 chạm mép bắc sân).

### 2.4. Đèn (`components/three/CampusScene.tsx`)

Mặt trời chính từ đông-nam [80, 100, 40] không còn chiếu trực tiếp mặt
đồng hồ mới (hướng bắc). Đo trên ảnh trước khi cân đèn:

| Vùng mẫu (ảnh closeup đồng hồ) | Mặt hướng nam cũ | Mặt hướng bắc mới, chưa cân đèn | Sau khi thêm fill bắc |
|---|---|---|---|
| Tường trắng (giữa biển tên và lam) | lum 187 | lum **137** | lum **163** |
| Mặt đồng hồ (góc phải-trên / trái-dưới) | lum 152 / 191 | lum **119 / 136** | lum **144 / 162** |

→ Thêm **một đèn fill bắc (không bóng)**: `directionalLight
position={[0, 40, -90]} intensity={0.5}`. Fill tây 0,7 và fill nam 0,3
giữ nguyên. Mặt bắc mới đọc lại là tường trắng (không còn xám), mặt đồng
hồ trắng rõ; không thấy chói hay cháy sáng ở ảnh chụp lại. Vẫn tối hơn
chút so với mặt nam cũ được nắng trực tiếp — đúng vật lý (mặt bắc không
nhận nắng chính), không cố đẩy bằng nhau.

## 3. Ảnh trước / sau (cùng góc)

Tất cả ảnh sau trong `test-shots/`, tiền tố `r3-lib-*`; log:
`test-shots/r3-lib-shots.json` (6 ảnh, 0 console error, 0 page error).
Script chụp: `test/shots-r3-library.cjs` (port 8337) + chụp lại sau cân đèn:
`test/shots-r3-library-reshoot.cjs`.

| Góc | Trước (đợt 2) | Sau (đợt 3 gđ 2) | Đọc được gì |
|---|---|---|---|
| Top-down (bắc lên trên) | `r2-library-topdown-annotated.png` | `r3-lib-topdown.png` + `r3-lib-topdown-annotated.png` | Footprint đỏ viền x 29,5..46,5, z 20..44,1; mũi tên mặt đồng hồ chỉ lên bắc; tháp đông / khối bên tây; sân trước cửa bắc (plaza tới z 14); đảo cỏ + lộc vừng vẫn ở sân nam |
| Từ bên hồ nhìn đông | `r2m-library-west-from-lake.png` | `r3-lib-west-from-lake.png` | Mặt tây mới: dải cửa sổ ngang của tháp + khối bên, **không** đồng hồ/lam/biển/sảnh |
| Mặt chính (cũ: từ sân nam) | `r2m-library-front-south.png` (avatar (38,57)) | `r3-lib-front-north.png` (avatar (38,6), nhìn nam) + `r3-lib-clock-closeup.png` (2048×1280, avatar (38,8)) | Đồng hồ + 2 cụm lam + biển `THƯ VIỆN TẠ QUANG BỬU` + sảnh 4 cột + cửa kính, kẹp giữa 2 cau mới; trục cửa thoáng (không còn đảo cỏ chắn như ảnh cũ) |
| Từ sân nam cũ nhìn bắc | `r2m-library-front-south.png` | `r3-lib-south-from-yard.png` (cùng setup (38,57)) | Nay là **mặt sau**: cửa sổ ngang tháp + khối bên, không đồng hồ — chứng minh chỉ có một mặt đồng hồ |
| Sân trước cửa mới | — (chưa có) | `r3-lib-forecourt.png` (avatar (38,12), nhìn nam) | Đứng giữa 2 cau (33/43, 15,5), nhìn vào cửa kính z 21,44 + bậc + cột hiên |

Lưu ý khung hình: ảnh `front-north` cắt nửa trên đồng hồ giống hệt ảnh
`front-south` đợt 2 (cùng setup pitch/dist) — cặp đối chiếu giữ nguyên
cách lấy khung; ảnh closeup hi-res mới thấy trọn mặt tiền + biển tên.

## 4. Kết quả test

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | PASS, ra `out/` (build lại sau khi thêm fill bắc) |
| Engine `test/learn.test.cjs` | **45/45 pass**, 0 fail |
| `test/leg-sim.cjs` | **4/4 chặng pass** (leg1 8,2 s; leg2 14,1 s; leg3 38,3 s, 132,4 m; leg4 4,2 s; spawnCheck pass). leg3 có 385 lần chạm `Bồn cỏ C1Building (đông)` — có từ trước, không liên quan đợt này (khu C1 không đụng tới), chặng vẫn pass |
| `test/walk-to-library-door.cjs` (đích mới) | **PASS** — (24,28) → (24,18) → (38,18) → (38,20): 5,5 s, 22 m, 0 lần chạm; đứng (38, 20,5) bị đẩy về z = 19,1 đúng collider mới; đứng sân trước (38,16) và sân nam (38,52) không chạm |
| `test/verify-step4fix.cjs` | **24/24 PASS, 0 console error, 0 page error** (chạy 13 phút; xem §5 về 2 lần chạy dở trước đó) |
| Ảnh chụp r3 (6 ảnh) | 0 console error, 0 page error |

## 5. Lỗi còn tồn / chưa xác minh được

1. **`verify-step4fix` từng kẹt 2 lần ở cùng 1 ảnh chụp** (lượt chạy lúc
   15:20 và 15:27): `page.screenshot: Timeout 120000ms exceeded` tại
   `step4fix-05-prompt-e.png`, chỉ ghi được 1/24 step (step đó PASS, 0 lỗi).
   Đây là **harness chậm, không phải lỗi scene**: đo riêng bước đó với
   timeout 300 s thì ảnh chụp xong sau **109,9 s** (SwiftShader dưới tải
   máy cao — lúc đó load average 3–9 do các giai đoạn song song cùng chạy
   browser). Lượt chạy lại lúc 15:31 (load đã hạ) đi hết **24/24**. Nếu chạy
   lại vào lúc máy bận, timeout 120 s này có thể tái diễn — nên chạy
   verify khi máy rảnh, hoặc tăng timeout chụp của script đó.
2. **Chưa xác minh trên điện thoại thật / FPS**: mọi ảnh và test đều là
   headless Chromium + SwiftShader. Cảm giác đi bộ vào sảnh mới, độ sáng
   mặt bắc trên màn hình thật vẫn cần mắt user.
3. **Phương vị la bàn thật** của mặt đồng hồ ngoài đời vẫn chưa xác minh
   (như `library-orientation.md` §8) — báo cáo này chỉ nói hướng trong
   scene (−Z = "bắc của scene").
4. **Chưa kiểm tra va chạm bằng tay trong game** (đi bộ thật bằng phím
   từ (24, 28) vào tới cửa): chỉ có leg-sim + walk test mô phỏng bằng đúng
   code va chạm `resolveCollisions`. Cột hiên (z 17,2) và cau mới không có
   collider riêng (giữ như cũ) — avatar có thể đi xuyên cột/cau; chấp nhận
   được như bản cũ, nếu khó chịu thì thêm collider riêng sau.
5. **Mặt bắc mới vẫn tối hơn mặt nam cũ** một chút (tường lum 163 so với
   187 — xem §2.4). Đã cân bằng fill bắc 0,5 và dừng ở đó; đẩy thêm sẽ
   sáng cả các mặt bắc khác trong campus (C1, nhà phụ).

## 6. File đã sửa (phạm vi giai đoạn 2)

- `components/three/LibraryBuilding.tsx` — group xoay π + đồng hồ/biển
  tên đổi ngược về cục bộ + cau dời sang (33/43, 15,5) + comment cập nhật.
- `lib/campus.ts` — `LIBRARY.clock` (38, 9,6, 19,9), `LIBRARY.plaza`
  minZ 18 → 14, collider thư viện z 19,5..44,6, đường C1–Thư viện và
  Thư viện–Hồ Tiền nối tại (24, 18), comment đầu file + LIBRARY.
- `components/three/CampusScene.tsx` — chỉ thêm 1 đèn fill bắc 0,5.
- `test/walk-to-library-door.cjs` — đích mới cửa bắc (24,28) → (24,18) →
  (38,18) → (38,20) + sanity checks mới.
- Mới: `test/shots-r3-library.cjs`, `test/shots-r3-library-reshoot.cjs`,
  `test-shots/r3-lib-*.png` (6 ảnh + 1 ảnh top-down đánh dấu),
  `test-shots/r3-lib-shots.json`, file báo cáo này.
- `components/three/Ground.tsx` — **không sửa code** (vẽ theo
  `LIBRARY.plaza`/`ROADS` nên tự theo số mới; đã kiểm bằng ảnh).
- Không sửa: `StudentAvatar` / `Player` / `Npc` / `Trees` / `TienLake` /
  `app/page.tsx` / `lib/learn/*` / `PROGRESS.md` / `NEXT_STEPS.md`.
  Không deploy, không tạo project Vercel, không chạm hoc-hsk/chua-online.
  Script chẩn đoán tạm `test/_repro-shot-timeout.cjs` đã xóa sau khi dùng.
