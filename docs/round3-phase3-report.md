# Báo cáo Giai đoạn 3 đợt 3 — Bỏ "sợi dây" dưới tán cây (liễu ven Hồ Tiền)

Ngày: 06/11/2026. Phạm vi: chỉ `components/three/TienLake.tsx` (`LakeWillow`).
Không sửa `StudentAvatar` / `Player` / `Npc` / `LibraryBuilding` / `campus.ts` /
`app/page.tsx` / `lib/learn/*`, không sửa `Trees.tsx`, không deploy.

## 1. Mẫu nào có "sợi dây" — bằng chứng ảnh cận

**Kết luận: `LakeWillow` trong `components/three/TienLake.tsx` — mẫu dùng chung
cho cả 9 cây liễu ven hồ (`LAKE_WILLOWS` trong `lib/campus.ts`).**

- Ảnh cận TRƯỚC `test-shots/r3-tree-before-willow-west-close.png` (cây
  (-27.5, 50), đứng (-30.9, 50) nhìn đông): thấy rõ 5–6 sợi xanh mảnh, dài
  ~1,5–2 m thả thẳng đứng từ mép tán xuống, đọc đúng như user mô tả —
  dây điện / chân sứa. Đó là 8 cành rủ/cây: ống `TubeGeometry` theo đường cong
  CatmullRom (`WILLOW_STEM` #6B7A4A) + 7 cụm lá dài-mỏng (0,42 m × 0,1 m)
  chồng dọc mỗi cành — tức 8 ống + 56 cụm lá/cây, 72 ống + 504 cụm cho 9 cây.
- Ảnh cận TRƯỚC `test-shots/r3-tree-before-willow-east-close.png` (cây
  (22.2, 10)): các sợi cũng lộ ở rìa trên khung hình; thân cây che giữa khung
  (xem mục 6 về góc chụp này).
- **Nghi phạm phụ đã loại trừ:** `DroopingTree` trong `components/three/Trees.tsx`
  — grep toàn repo: chỉ có định nghĩa, **không nơi nào import/dùng**.
  `ImprovedTree` (cây đường tình yêu, `Landmarks.tsx:360`, `BackgroundBuildings.tsx:202`)
  không có bộ phận rủ nào trong code; ảnh cận `r3-tree-before-love-close.png`
  không thấy sợi dây (xem mục 6 về hạn chế khung hình của ảnh này).

## 2. Đã xóa như thế nào

File duy nhất sửa: `components/three/TienLake.tsx`.

- **Xóa hẳn:** trường `strands` khỏi `WillowSpec` + vòng tạo 8 cành rủ trong
  `buildWillowSpecs()` (kể cả logic "cành phía hồ dài hơn"); `useMemo` tạo
  `TubeGeometry`/`CatmullRomCurve3` + `useLayoutEffect` đặt 56 cụm lá/cành
  (`tuftRef` instancedMesh) trong `LakeWillow`; 8 mesh ống cành rủ; hằng
  `WILLOW_STEM` (không còn dùng). Grep sau sửa: 0 tham chiếu `strands` /
  `tuftRef` / `TubeGeometry` trong file (chỉ còn ghi chú trong comment).
- **Không thay dây xanh bằng dây màu khác; không thêm rễ khí sinh, cành rủ.**
- **Giữ nguyên:** thân thuôn (`cylinderGeometry` 0,14/0,24, cao 2,6–3,4 m, hơi
  nghiêng), 4 nhánh từ ngọn thân chĩa ra tán, 4 sắc xanh tán
  (`WILLOW_TONES`), seed cố định `mulberry32(20261106)` → build nào cũng
  giống nhau, tỉ lệ cây `s` 0,88–1,18. Thêm `rotY` (xoay quanh Y theo seed)
  để 9 cây lệch hướng nhau.
- **Collider:** liễu vốn không có collider — đã xác minh (`LAKE_WILLOWS` chỉ
  xuất hiện ở `lib/campus.ts:236` (dữ liệu vị trí) và `TienLake.tsx`; không có
  mục nào trong `BUILDING_COLLIDERS`) — và **không thêm collider mới**.
  Khoảng trống dưới tán vẫn thoáng: cụm tán thấp nhất có đáy ≈
  `s·(trunkH + 0,45 − r·sy)` ≈ 2,2–2,9 m tùy cây (trunkH 2,6–3,4 m,
  tỉ lệ cây 0,88–1,18), tức cao hơn đầu người (~1,7 m) khoảng 0,5–1,2 m.

## 3. Tán sau sửa

- 5 cụm → **7 cụm lệch nhau**, góc mỗi cụm rút ngẫu nhiên (không chia đều):
  khối chính r 1,75; khối đỉnh r 1,15; 3 khối bên r 0,72–1,0; **2 cụm rìa
  thấp** (r 0,55–0,62, tâm ở `trunkH + 0,45` / `+ 0,6`) chạm mép tán để tán
  không bị "cắt ngang" ở một độ cao.
- **Hết dẹt đều 0,55:** `sy` riêng từng cụm — 0,62–0,72 (dẹt), 0,78–0,88
  (vừa), 0,95–1,0 (gần tròn) — silhouette lệch cao/thấp, dẹt/tròn không đều.
- Màu: vẫn 4 sắc xanh gần nhau (`#5D7D4A`, `#6E8F57`, `#5A7D2A`, `#7C9B60`),
  rút theo seed từng cụm → có khoảng sáng/tối giữa các cụm.

## 4. Ảnh trước / sau (cùng script `test/r3-tree-shots.cjs`, server riêng :8338)

| Ảnh | Trước | Sau | Đọc được |
|---|---|---|---|
| Cận liễu bờ tây (-27.5, 50) | `r3-tree-before-willow-west-close.png` | `r3-tree-after-willow-west-close.png` | **Hết dây.** Tán thành khối lá tròn lớn, khoảng trống dưới tán thoáng, không còn sợi nào thả xuống. |
| Cận liễu bờ đông (22.2, 10) | `r3-tree-before-willow-east-close.png` | `r3-tree-after-willow-east-close.png` | Hết dây; tán nhiều cụm tròn lệch (khối chính + khối phụ bên phải), thân + nhánh rõ. |
| Cận cây thường ImprovedTree (28, -19.5) | `r3-tree-before-love-close.png` | `r3-tree-after-love-close.png` | Không có dây (trước và sau giống nhau về bản chất — cây này không sửa). |
| Góc trung bờ đông + hồ | `r3-tree-before-willow-east-mid.png` | `r3-tree-after-willow-east-mid.png` | Liễu trong bối cảnh hồ: tán tròn, không còn sợi; hoa sen/lá/bờ kè không đổi. |
| Góc trung bờ tây + hồ | `r3-tree-before-willow-west-mid.png` | `r3-tree-after-willow-west-mid.png` | Liễu hai bờ hồ đọc thành tán tròn nhiều cụm, không còn sợi. |

Cả hai lượt chụp: **0 lỗi console, 0 lỗi page** (xem `test-shots/r3-tree-shots-before.json`,
`test-shots/r3-tree-shots-after.json`).

## 5. Kết quả test

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Type-check | `npx tsc --noEmit` | **PASS, exit 0** (trước và sau sửa) |
| Build | `npm run build` | **PASS** (sau sửa; `out/` static, First Load JS 232 kB) |
| Test engine | `node --test test/learn.test.cjs` | **PASS 45/45, 0 fail** |
| Leg-sim hồi quy campus | `node test/leg-sim.cjs` | **PASS 4/4** (leg1 8,2 s/32,7 m; leg2 14,1 s/56,5 m; leg3 38,3 s/132,4 m, hits Bồn cỏ C1Building (đông) 385 — như baseline; leg4 4,2 s/16,6 m; spawn OK) |
| Verify Bước 4–5 | `node test/verify-step4fix.cjs` (lượt chạy của giai đoạn 3, server :8326) | **PASS 24/24, 0 lỗi console, 0 lỗi page** (`test-shots/verify-step4fix.json`, at 2026-11-06T16:03:20Z; log `/tmp/r3-verify4fix-mine.log`). B-fix 16/16, C-fix 5/5, E-fix 3/3. Lưu ý: lượt chạy đầu tiên của giai đoạn 3 chết ở ảnh đầu (screenshot timeout 120 s) vì luồng giai đoạn 1 đang chiếm context WebGL SwiftShader cùng lúc — lỗi hạ tầng test, không phải lỗi scene; hai lượt chạy của các luồng song song trước đó cũng cho 24/24 trên cùng bản build. |

<!-- (đã điền ở bảng mục 5) -->

## 6. Lỗi còn tồn / hạn chế đã biết (nói thẳng)

1. **Cặp cận bờ đông không cùng góc chụp.** Lượt chụp TRƯỚC đầu tiên đặt
   avatar quá sát thân (25.6, 10, yaw π/2) nên thân che giữa khung; đã đổi
   góc chụp tốt hơn (25.0, 12.5, yaw 0,85) rồi chạy lại lượt TRƯỚC, nhưng
   lượt chạy lại này **timeout ở ảnh đầu tiên** vì hai luồng song song
   (giai đoạn 1 + 2) đang chiếm cả hai context WebGL SwiftShader cùng lúc —
   và file TRƯỚC cũ không bị ghi đè. Vì vậy: ảnh TRƯỚC bờ đông là góc cũ,
   ảnh SAU bờ đông là góc mới (đều cận cây (22.2, 10), cách ~3,5–4 m).
   Cặp cận bờ tây + cả hai góc trung thì **cùng góc**.
2. **Ảnh cận cây thường (ImprovedTree) bị cây đôi che.** Đường tình yêu có
   cây đôi ở (28, -12.5) và (28, -19.5); avatar đứng giữa hai cây nên camera
   (sau lưng avatar) nằm ngay dưới tán cây (28, -12.5) — cả ảnh TRƯỚC lẫn
   SAU đều bị tán cây sau lưng choán khung. Ảnh vẫn chứng minh được
   "không có sợi dây" trên `ImprovedTree`, nhưng không phải ảnh cận đẹp của
   đúng cây (28, -19.5). Muốn chụp lại cần đứng lệch sang bên (x ≈ 31)
   thay vì cùng trục x = 28.
3. **Nhìn từ ngay dưới tán, khối chính vẫn chiếm ưu thế.** Ở ảnh SAU cận bờ
   tây, tán đọc thành một khối tròn lớn (khối chính r 1,75, sy ~0,8) — hết
   dạng "đĩa xếp chồng", nhưng các cụm phụ chỉ lộ rõ khi nhìn ngang/nghiêng
   (ảnh cận bờ đông) chứ không lộ từ góc nhìn thẳng dưới lên. Nếu user vẫn
   thấy "mũ nấm", hướng sửa tiếp là thu nhỏ khối chính (r ~1,4) và đẩy các
   cụm bên ra xa/lệch cao hơn — chưa làm vì cần mắt user chốt trước.
4. **Chưa xác minh trên điện thoại thật / FPS.** Mọi ảnh đều từ
   `chromium_headless_shell-1248` + SwiftShader (~1–2 fps); màu tán dưới
   nắng thật trên máy user có thể khác. Liễu vẫn là 7 mesh cầu/cây × 9 cây
   (rẻ hơn trước: đã bỏ 72 ống + 1 instancedMesh 504 cụm), nên không kỳ vọng
   ảnh hưởng FPS.
5. **Build `out/` hiện tại chứa cả thay đổi của giai đoạn 1 + 2** (họ chạy
   song song, cùng build sau khi mình sửa xong). `tsc`/`build`/`engine`/
   `leg-sim` ở trên chạy trên cây source sau sửa của giai đoạn 3; nếu cần
   đối chứng riêng giai đoạn 3 thì checkout riêng file `TienLake.tsx`.

## 7. Những gì chưa xác minh được

- Mắt user trên điện thoại/máy thật: tán mới có còn đọc thành "mũ nấm" không
  (mục 6.3), và màu 4 sắc xanh có đủ chiều sâu dưới nắng thật không.
- Va chạm thực tế khi đi bộ xuyên dưới tán liễu trong game (leg-sim không
  cover vì liễu không có collider theo thiết kế; chỉ suy ra từ số đo đáy tán
  ~2,5 m trong code).
