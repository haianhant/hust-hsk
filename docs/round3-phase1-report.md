# Báo cáo giai đoạn 1 đợt 3 — Sửa nhân vật ngược (đầu, tay, chân)

> Phạm vi: chỉ `components/three/StudentAvatar.tsx`, `components/three/Player.tsx`
> (phần animation/hướng mặt + hook `getPose`), `components/three/Npc.tsx`
> (tư thế tĩnh). Không đụng `lib/campus.ts`, LibraryBuilding, Trees, TienLake,
> `app/page.tsx`, `lib/learn/*`. Không deploy. Không chạm hoc-hsk/chua-online.
> Test kiểm chứng: `test/r3-phase1.cjs` (server riêng 127.0.0.1:8336,
> chromium headless shell, SwiftShader ~0,25 fps nên các lần chờ lắng đều
> poll theo `getPose` thật thay vì sleep cố định).

## 0. Quy ước hướng (đã xác minh lại từ code, không lấy theo cảm tính)

- Mặt trước model = **+Z** (mắt/mũi/miệng, cổ bẻ, chữ HUST, túi kangaroo,
  mũi giày ở +Z; balô ở −Z). Gốc y = 0 tại mặt đất, cao 1,707 m.
- Với `rotation.x` (quy tắc bàn tay phải quanh trục +X): điểm treo dưới
  (−Y, ví dụ cẳng chân/cẳng tay buông) có `z' = −sinθ` → **rotation.x
  DƯƠNG xoay chi về SAU (−Z), ÂM xoay về TRƯỚC (+Z)**.
- Nhân vật quay mặt +Z thì **bên TRÁI của nhân vật là +X** (người đối diện
  nhìn thấy tay trái của nhân vật ở phía tay phải của mình). Chữ HUST ở
  ngực trái đã đúng ở +X — đây là mốc neo cho trái/phải.

## 1. Lỗi đã xác minh (TRƯỚC sửa — bản live dpl_DVAbaGCumK88cnWGXZQzzqAF479M)

### (a) Gối gập ngược chiều + sai pha — XÁC MINH ĐÚNG

- Code cũ: `lerp(knee, 'x', -kneeTarget)` với `kneeTarget = 0,05 + 0,85·max(0, cos phase)` —
  tức `rotation.x` **âm** → cẳng chân xoay về **trước** (ngược giải phẫu:
  gối người thật chỉ gập cẳng chân về sau).
- Log `getPose` khi đi thẳng (24 mẫu, `test-shots/r3-av-before.json`):
  `|kneeL|` cực đại **0,63 ở phase 0°**, lúc đó `legL = −0,12` — gối cong
  nhất khi chân đang ở giữa thân và vung về sau (giữa thì chống), trong
  khi đi thật gối cong nhất lúc chân vung về trước qua dưới thân.
- Lưu ý: `getPose` cũ báo `knee = −rotation.x` nên dấu ngược này bị che
  trong log — đã sửa thành báo góc thô (xem §2).

### (b) Khuỷu gập ngược chiều + sai pha — XÁC MINH ĐÚNG

- Code cũ: `elbowTarget = +0,30…0,60` (`rotation.x` dương) → cẳng tay xoay
  về **sau** (ngược giải phẫu: khuỷu chỉ gập cẳng tay về trước). Pha phụ
  cũ `max(0, sin(phase+π))` cho tay L đạt cực đại ở phase 270°, đúng lúc
  tay L vung về sau hết cỡ — ngược với đi thật (khuỷu cong thêm khi tay
  vung về trước).
- Ảnh: crop tay phải nhìn từ bên hông (`test-shots/crops/r3-av-before-hand-right-profile.png`)
  cho thấy cẳng tay nghiêng rõ về phía sau lưng ở tư thế nghỉ.

### (c) Nhãn trái/phải bị đảo — XÁC MINH ĐÚNG (chỉ nhãn/phía gắn, không phải hình học tay)

- Code cũ: `armL/legL` gắn ở `side = −1` (x âm), `armR/legR` ở `+X` — trong
  khi bên trái thật của nhân vật là +X (HUST ngực trái đã đúng ở +X).
- Hình học bàn tay thì **đúng theo phía vật lý**: crop tay trái nhìn từ
  trước (`test-shots/crops/r3-av-before-hand-front-left.png`) cho thấy
  ngón cái ở phía trong (về phía thân) + hơi về trước — đúng tay trái.
  `Hand` đi theo `side` (ngón cái ở `−side·0,042`) nên chỉ cần đổi phía
  gắn, không sửa `Hand`.
- Đung đưa chéo tay–chân theo nhãn vẫn đúng (tay L ngược pha chân L),
  nhưng sau khi đổi phía gắn thì tay/chân "trái" mới là trái thật.

### (d) Đầu/mặt/balô/giày — XÁC MINH: ĐÃ ĐÚNG, không phải lỗi

- 4 hướng (`r3-av-before-player-{front,back,left,right}.png`) + quay vòng
  8 góc 45° (`r3-av-before-orbit-*.png`): mặt/mắt/mũi/HUST/mũi giày cùng
  hướng đông (+X, hướng mặt); balô đen nằm sau lưng, quai đeo ôm qua vai
  và trước ngực, không có đoạn thừa lơ lửng; nhìn từ trái/phải, mũi giày
  hướng trước, gót sau; giày có mũi (cầu trước) + thân + đế, không phải
  2 tấm phẳng.
- `measureAvatar` (đo lúc blend còn 0,66 — xem lưu ý §5): cao 1,705 m,
  rộng 0,616 m, sâu 0,685 m; z −0,395…+0,29 (sâu hơn thiết kế 0,56 do
  đo giữa bước đi, xem §5).
- Đầu không tự quay 180°: mặt nhất quán suốt chuỗi quay vòng 8 góc.

### Đi tới đúng hướng mặt — XÁC MINH: ĐÃ ĐÚNG, không phải lỗi

- Đi W 9 s: `Δ = (+2,40, 0,00)` m, hướng đi 90° so với facing 90°, lệch
  **0°** — nhân vật tiến theo hướng mặt, không đi lùi trong khi chạy
  animation tiến.

## 2. Cách sửa (file nào + sửa gì)

### `components/three/StudentAvatar.tsx` — đổi phía gắn trái/phải

- `HumanFigure`: khớp `*L` (tay/chân trái) gắn `side={1}` (+X), khớp `*R`
  gắn `side={-1}`. Một chỗ duy nhất; không đụng `Hand`, `Torso`, `Head`,
  `Backpack`, không dùng scale âm, không thêm góc xoay bù. Ghi chú quy
  ước trái = +X vào header comment của `HumanFigure`.
- Giữ nguyên: polo đỏ HUST + chữ HUST ngực trái (+X), vai dốc, tỉ lệ
  1,707 m, balô, giày.

### `components/three/Player.tsx` — dấu khớp + pha + bù cổ chân + `getPose`

- Gối: `rotation.x = +kneeTarget` (bỏ dấu trừ); pha mới
  `kneeL = 0,05 + 0,85·max(0, −cos phase)` (cực đại ở **phase π** — chân
  vung về trước qua dưới thân), `kneeR = 0,05 + 0,85·max(0, cos phase)`.
- Khuỷu: `elbowL = −(0,30 + 0,18·blend·max(0, sin phase))`,
  `elbowR = −(0,42 + 0,18·blend·max(0, sin(phase+π)))` — gập về trước,
  cong thêm khi tay vung về trước.
- Cổ chân (suy lại theo dấu gối mới): bàn chân phẳng lúc tiếp đất cần
  `leg + knee + foot ≈ 0` → `foot = −(leg + knee)·0,9` (kẹp ±0,5),
  thay cho công thức cũ `−(leg − knee)·0,9` (công thức cũ với gối mới
  sẽ cho bàn chân lệch tới +1,4 rad, mũi giày đâm xuống đất giữa bước).
  Giữa bước vung (gối 0,9, cổ chân cao 0,166 m) bàn chân nghiêng mũi
  xuống ~0,4 rad, mũi giày vẫn cách đất ~0,03 m — không xuyên nền.
- `getPose`: `kneeL/kneeR` báo `rotation.x` thô (bỏ phép đảo dấu cũ);
  ghi rõ quy ước dấu trong comment (gối dương = gập đúng, khuỷu âm =
  gập đúng). Các trường khác không đổi.
- Không đụng logic di chuyển/va chạm/camera rig.

### `components/three/Npc.tsx` — tư thế tĩnh

- `LayeredFigure`: khuỷu `+0,30/+0,42` → `−0,30/−0,42`; gối `−0,05` →
  `+0,05` (gần thẳng, đúng chiều). Tay `+0,09/−0,05` giữ nguyên (đó là
  đung đưa vai, không phải gập khuỷu). Áp cho cả Minh và cô giáo qua
  `HumanFigure` chung.
- Trang phục giữ nguyên: Minh hoodie navy + mũ đỏ + kaki + balô xám;
  cô giáo sơ mi trắng + kính + tóc búi.

## 3. Kết quả kiểm chứng SAU sửa

- `test/r3-phase1.cjs after`: **7/8 bước PASS, 0 console error, 0 page error**
  (`test-shots/r3-av-after.json`). Bước FAIL duy nhất là khung hình đi nhìn
  từ bên hông trong script chính (kéo chuột không bắt được cửa sổ offset +
  phase) — đã chụp bù thành công bằng script riêng (xem dưới).
- **Gối**: `|kneeL|` (rotation.x thô) cực đại **+0,57 ở phase 174°** (kỳ vọng
  ~180° — chân vung về trước qua dưới thân), `legL = +0,14` lúc đó (chân
  vừa qua dưới thân, đang vung về trước). Theo khoảng phase (40 mẫu đi):
  gối L +0,05 lúc tiếp đất (phase 0–45° và 270–360°), +0,27 ở 90–135°,
  +0,57 ở 135–180°; gối R đối xứng (+0,38 ở 0–45°). **Dấu dương suốt chu
  kỳ = cẳng chân về sau — đúng chiều.** (Mẫu chỉ phủ ~3/4 chu kỳ do render
  chậm ~5 frame/20 s; khoang cực đại và khoang tiếp đất đều có mặt.)
- **Khuỷu**: `elbowL/elbowR` **âm suốt chu kỳ (−0,30…−0,45)** = cẳng tay về
  trước — đúng chiều; khuỷu L cong nhất (−0,40) ở phase 90–135°, đúng lúc
  tay L vung về trước. Tư thế nghỉ (blend 0,07): khuỷu L −0,300, khuỷu R
  −0,437; gối L +0,050, gối R +0,060; bàn chân +0,001/−0,011 (≈ phẳng).
- **Đung đưa chéo**: tay L ngược dấu chân L ở **33/40 mẫu** (7 mẫu còn lại
  ở lân cận điểm đổi dấu). Tay L +0,117 / tay R −0,081 lúc nghỉ (không song
  song cứng).
- **Cổ chân**: ankleY min lúc gối duỗi = **0,071** (đế giày ≈ 0,071 − 0,07
  ≈ 0,001 m — chạm đất, không xuyên nền); ankleY max lúc vung = **0,156**.
- **Đi thẳng về trước**: Δ = (+2,80, 0,00) m, hướng đi 90° so với facing
  90°, lệch **0°** — vẫn tiến theo hướng mặt.
- **Bên hông** (`test/r3-phase1-side.cjs`: **2/2 PASS**, 0 lỗi): đi —
  phase 154°, kneeL +0,54, elbowL −0,40, camera lệch đúng 90°;
  chạy — phase 209°, kneeL +0,65, elbowL −0,34, camera lệch 90°.
  Ảnh `r3-av-after-gait-side-kneemax.png` (đi) và
  `r3-av-after-gait-side-run.png` (chạy) cho thấy: chân trước duỗi thẳng,
  bàn chân phẳng chạm đất; chân sau gối gập về sau, gót nhấc, mũi chạm đất;
  tay gập về trước; thân chạy nghiêng nhẹ về trước.
- **4 hướng + quay vòng**: `r3-av-after-player-{front,back,left,right}.png`,
  `r3-av-after-orbit-*.png` (8 góc 45°) — mặt/HUST/mũi giày cùng hướng,
  balô sau lưng, đầu không quay 180°.
- **Đo neutral** (blend 0,07): cao **1,711 m**, rộng 0,524 m, sâu 0,52 m
  (z −0,314…+0,206; mũi giày +0,206 ≈ thiết kế +0,20).
- **Minh** (`r3-av-after-minh-{front,back,left,right}.png`): đủ 4 hướng,
  hoodie navy + mũ đỏ + kaki + balô xám giữ nguyên; tay gập về trước,
  balô sau lưng.
- **Cô giáo**: trước (`r3-av-after-teacher-front.png`: sơ mi trắng, kính,
  mặt +Z) + bên hông (`r3-av-after-teacher-side.png`, chụp lại lệch trục:
  búi tóc + trâm rõ) + sau lưng chếch tây-bắc
  (`r3-av-after-teacher-back.png`: lưng + búi tóc + trâm, không thấy mặt).
  Ảnh sau lưng phải chụp 3 lần mới được do phòng hẹp (camera kẹp tường bắc
  + `distRef = 3 m` khi vào phòng — xem §5).

## 4. Ảnh đối chiếu trước/sau (từng hướng)

| Hướng | Trước | Sau |
|---|---|---|
| Trước | `test-shots/r3-av-before-player-front.png` | `test-shots/r3-av-after-player-front.png` |
| Sau | `test-shots/r3-av-before-player-back.png` | `test-shots/r3-av-after-player-back.png` |
| Trái | `test-shots/r3-av-before-player-left.png` | `test-shots/r3-av-after-player-left.png` |
| Phải | `test-shots/r3-av-before-player-right.png` | `test-shots/r3-av-after-player-right.png` |
| Đi, sau lưng, pha gối max | `test-shots/r3-av-before-gait-back-kneemax.png` | `test-shots/r3-av-after-gait-back-kneemax.png` |
| Đi, bên hông, pha gối max | (không chụp được ở lượt trước — xem §5) | `test-shots/r3-av-after-gait-side-kneemax.png` (+ chạy: `r3-av-after-gait-side-run.png`) |
| Minh trước/sau/trái/phải | `test-shots/r3-av-before-minh-{front,back,left,right}.png` | `test-shots/r3-av-after-minh-{front,back,left,right}.png` |
| Cô giáo trước/bên/sau | `test-shots/r3-av-before-teacher-front.png` (trước, rõ); bên/sau lượt trước bị lỗi khung hình (người chơi che cô / camera kẹp tường — xem §5), không có ảnh đối chiếu dùng được | `test-shots/r3-av-after-teacher-{front,side,back}.png` |

## 5. Lỗi còn tồn / chưa xác minh được

- **Khung hình đi nhìn từ bên hông — ĐÃ XỬ LÝ, có ảnh sau sửa.** Lượt
  TRƯỚC và lượt SAU trong script chính đều không bắt được (kéo chuột từng
  bước nhỏ thì facing đuổi kịp camera; cú kéo lớn một lần cũng trượt cửa
  sổ phase). Cách bắt thành công (`test/r3-phase1-side.cjs`, 2/2 PASS):
  giữ W tới khi phase ≈ π rồi **thả phím TRƯỚC khi teleport camera sang
  bên hông** — thả phím thì facing ngừng nội suy nên khung hình giữ đúng
  profile 90° trong khi khớp mới lắng một nấc về idle. Lưu ý: pose đọc
  sau khi chụp xong đã lắng hẳn (blend 0) nên không dùng để kiểm lệch —
  ảnh chụp mới là bằng chứng đúng thời điểm.
- **Ảnh cô giáo bên hông/sau lưng lượt TRƯỚC bị lỗi khung hình** (người
  chơi đứng cùng trục nên che mất cô; camera trong phòng hẹp bị kẹp tường
  bắc ngay trên đầu người chơi) — không có ảnh đối chiếu trước/sau cho 2
  góc này; chỉ có ảnh trước rõ. Lượt SAU chụp lại lệch trục thì được ảnh
  bên hông rõ; ảnh sau lưng phải thử 3 lần: nguyên nhân là
  `enterClassroom` đặt `distRef = 3 m` (camera quá gần → cô lệch 61° khỏi
  trục, ngoài khung) — lăn chuột xuống để `distRef → 4,5 m` mới lọt khung
  ở góc chếch tây-bắc. Đây là giới hạn khung hình kiểm tra, không phải lỗi
  model.
- **Đo `measureAvatar` lượt TRƯỚC lấy lúc blend = 0,66** (SwiftShader
  ~0,25 fps, blend lắng chậm hơn sleep cố định 3 s): ảnh 4 hướng lượt
  trước chụp khi chân còn hơi dư bước (legL 0,156 ở thời điểm đo idle),
  tuy nhìn gần như trung tính. Lượt SAU poll `getPose` tới khi
  `blend < 0,08` và `facing` hội tụ ±0,08 rad mới chụp (blend 0,07).
- **Mẫu chu kỳ đi chỉ phủ ~3/4 chu kỳ** (render chậm: ~5 frame/20 s; khoang
  phase 180–270° không có mẫu đi, mẫu chạy phủ một lát cắt hẹp —
  kneeL chạy 0,50…0,61 trong lát cắt đó). Hướng gập (dấu) và pha cực đại
  đã xác minh được; toàn bộ chu kỳ chạy chưa lấy mẫu đủ — ảnh bên hông
  lúc chạy bù đắp phần nào.
- **Túi ngực sơ mi cô giáo ở ngực phải (−X)**: quan sát thấy, nhưng là
  chi tiết trang phục, ngoài phạm vi "hướng/khớp" của giai đoạn này nên
  giữ nguyên, không đổi.
- **Lần build đầu tiên của đợt này lỗi export thoáng qua** (`MODULE_NOT_FOUND`
  trong `next/dist/server/require-hook.js` khi static export), chạy lại
  `npm run build` lần 2 thì pass, không đổi code. Ghi lại để coordinator
  biết build có lúc không ổn định.
- **Chưa xác minh trên điện thoại thật / FPS thật**: mọi ảnh và log đều
  từ SwiftShader headless (~0,25 fps); cảm giác đi/chạy, độ mượt animation
  và kích thước hiển thị trên máy thật vẫn cần mắt user.
- Tư thế ngồi xe là việc của giai đoạn 4 — không làm ở đây; các khớp đã
  đúng chiều để giai đoạn sau dùng.

## 6. Kết quả test hồi quy (sau sửa)

- `npx tsc --noEmit`: exit 0.
- `npm run build`: PASS, ra `out/`.
- `node --test test/learn.test.cjs`: 45/45.
- `node test/leg-sim.cjs`: 4/4 chặng pass (+ spawnCheck pass).
- `node test/verify-step4fix.cjs`: **24/24 PASS, 0 console error, 0 page error**
  (`test-shots/verify-step4fix.json`).
