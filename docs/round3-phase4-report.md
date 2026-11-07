# Báo cáo Giai đoạn 4 đợt 3 — Xe máy có thể lên ngồi và điều khiển

Ngày: 06/11/2026. Phạm vi: chỉ xe máy (brief §4). Không sửa
`StudentAvatar` / `Npc` / `LibraryBuilding` / `Trees` / `TienLake` /
`lib/learn/*`, không sửa `PROGRESS.md` / `NEXT_STEPS.md`, không deploy,
không chạm `hoc-hsk` / `chua-online`.

## 1. Mẫu xe + kích thước

File mới `components/three/Motorbike.tsx` (gắn trong `CampusScene`, chỉ
ngoài sân — không vào phòng học). Xe tay ga phổ thông, xanh lá đậm HUST
`#1c5c3a` + kem, thống nhất phong cách campus (blockout hình học như các
công trình khác, không model ngoài):

| Bộ phận | Số đo |
|---|---|
| Dài (trục bánh trước → sau) | 1,9 m (bánh trước z +0,70, bánh sau z −0,70) |
| Bánh | r 0,33 m, lốp torus + vành + 5 nan |
| Yên | cao 0,78 m, dài 0,55 m, rộng 0,32 m (hông người ngồi 0,80 m → ngồi đúng yên, không lún/kiễng) |
| Tay lái | y 1,02 m, rộng 0,62 m, tay nắm x ±0,28 + gương 2 bên + cụm đồng hồ |
| Chỗ để chân | sàn y 0,36 m, bàn đạp y 0,38 m, z +0,28 (cổ chân người ngồi ~0,46 m) |
| Đèn | pha trước (emissive) + đèn hậu đỏ + giá sau + kính chắn gió kem |

- Bánh quay theo vận tốc (`ω = v / r`), bánh trước đổi hướng theo lái
  (nhóm lái `rotation.y = steer`), thân nghiêng khi rẽ (`lean`, tối đa
  ±0,2 rad).
- Tỉ lệ với avatar 1,707 m đã soi bằng ảnh nghiêng `r3-bike-side.png`
  và ảnh 3/4 trước `r3-bike-front34.png` (xem mục 6).

## 2. Vị trí đỗ + gọi xe

- **Điểm đỗ ban đầu:** `BIKE_PARK = (-70, 14.5)`, đầu xe hướng đông
  (`heading = π/2`), cạnh cổng Parabol, phía bắc đường chính. Đường chính
  rộng 6 m (z = 7..13) nên z = 14,5 nằm **ngoài mặt đường**, không chắn
  lối đi; không chạm collider nào (chân cổng bắc ở x −89,2..−86,8, nhà
  gác z ≤ 2,5, cây gần nhất cách > 10 m). Spawn (-76, 10) cách xe ~7,5 m.
- **Nút "🛵 Gọi xe"** (`#call-bike`, góc dưới-phải): đưa **cùng một xe**
  tới điểm trống hợp lệ gần người chơi (vòng tròn bán kính 2,5–8 m,
  `findFreeSpotNear` + `resolveBikeCollisions`), đầu xe quay về phía
  người chơi. Không gọi được khi đang trong phòng học hoặc đang lái.
- **Chỉ 1 xe:** `Motorbike` chỉ mount 1 lần trong `CampusScene`;
  `bikeState.instances` đếm mount/unmount thật. Gọi xe 3 lần liên tiếp:
  vẫn `instances = 1`, xe về (-37,5, 10), cách người chơi 2,5 m cả 3 lần
  (xem `test/ride-check.cjs` bước `call-3x`).
- **Nút "🛵 Đưa xe về đường"** (`#recall-bike`): xe về điểm trên tim
  đường gần nhất (`nearestRoadPoint` + điểm trống quanh đó). Đang ngồi
  trên xe thì người đi theo xe về đường, vẫn đang lái. Kiểm chứng: xe từ
  (28, -18,6) về (28, -16) — đúng tim đường tình yêu, cách 0,00 m.

## 3. Lên / xuống xe

- **Lên xe:** đứng trong 2,2 m thì hiện `E — Lên xe` (mobile: nút
  ✋ Tương tác). Bấm E → `riding = true`, animation đi bộ dừng, camera
  về sau xe (yaw = heading + π, pitch ≥ 0,18, dist ≥ 8 m).
- **Thứ tự ưu tiên prompt E** (chỉ hiện ĐÚNG 1 prompt, `app/page.tsx`):
  1. đang lái → `E — Xuống xe` (đang chạy thì `E — Xuống xe (chỉ khi dừng hẳn)`);
  2. đứng gần xe (≤ 2,2 m) → `E — Lên xe` — ưu tiên hơn Minh/cửa lớp vì
     là hành động vật lý ngay trước mặt;
  3. các vật tương tác học tập (Minh / cửa lớp / bảng / vở / bài tập).
  Thực tế 2 vùng trigger không chồng nhau: xe đỗ (-70, 14,5) cách Minh
  (-72, 8) ~6,8 m, tổng bán kính trigger 2,2 + 2,5 = 4,7 m. Kiểm chứng
  (`prompt-single`): gần xe chỉ có đúng 1 prompt `E — Lên xe`, không
  hiện prompt Minh.
- **Tư thế ngồi** (ghi đè toàn bộ tư thế đi bộ trong `Player.tsx`, dùng
  đúng dấu khớp đã sửa ở giai đoạn 1 — mặt trước +Z, rotation.x ÂM =
  chi về TRƯỚC, DƯƠNG = về SAU): đùi về trước gần ngang
  (`leg ≈ −1,3`), gối gập cẳng về sau (`knee DƯƠNG ≈ +1,2` → cẳng gần
  thẳng đứng, bàn chân đặt đúng sàn xe), tay đưa về trước lên tay lái
  (`arm ≈ −0,95`), khuỷu gập cẳng về trước (`elbow ÂM ≈ −0,55`),
  thân nghiêng trước nhẹ 0,12 rad. Balô nằm trong nhóm `body` nên theo
  người lên yên, không xuyên yên. Số đo thật (`getPose`, góc thô):
  `legL = −1,17, kneeL = 1,08, armL = −0,88, elbowL = −0,53`
  (lượt chạy 3; lượt 2: −1,05 / 0,97 / −0,78 / −0,51).
- **Xuống xe:** phím E hoặc nút ✋ Tương tác, **chỉ khi |v| ≤ 0,5 m/s**.
  Bấm E khi đang chạy (v ≈ 3,3 m/s) → vẫn ngồi trên xe + toast nhắc
  phanh; phanh dừng rồi bấm E → xuống được (`dismount-blocked-moving`).
  Chỗ xuống: thử **trái → phải → sau → trước** (trái người lái = +X khi
  mặt +Z, theo quy ước giai đoạn 1), mỗi điểm kiểm tra
  `resolveCollisions` bán kính người 0,4 m; chật cả 4 hướng thì tìm điểm
  trống trong 4 m (`findFreeSpotNear`). Kiểm chứng sát bờ kè hồ
  (`dismount-tight`): xe ở (22,3, 40) hướng bắc, bên trái bị kè chặn →
  người xuất hiện bên phải ở (23,50, 40,00), không vào hồ/kè. Xuống
  thường: người đứng cách xe đúng 1,20 m.
- **Vào phòng học:** đang lái mà vào lớp (qua cửa) thì xe ở lại ngoài
  sân, người vào phòng ở trạng thái đi bộ; gọi lại xe sau khi ra.

## 4. Điều khiển + cảm giác tốc độ

PC (dùng đúng cơ chế `keysRef` hiện có, **không đổi** hành vi
`preventDefault` toàn cục — mục 7 đợt 3 sửa riêng ở giai đoạn tích hợp):

| Phím | Tác dụng |
|---|---|
| W | Ga (tăng tốc 6 m/s²) |
| S | Phanh (11 m/s²); chỉ lùi chậm (tối đa 2 m/s, tăng tốc lùi 3 m/s²) khi đã gần dừng (v ≤ 0,5 m/s) |
| A / D | Lái (góc lái tối đa 0,5 rad, thu hẹp theo tốc độ `1/(1+0,06·|v|)`; không quay tại chỗ khi \|v\| < 0,3 m/s; tốc độ quay kẹp ±1,2 rad/s) |
| E | Xuống xe (khi dừng) |

- **Tốc độ tối đa 14 m/s** (~3,5× đi bộ 4 m/s), trôi tự nhiên 2 m/s²
  khi không ga không phanh. Đo thật: `maxSpeed = 13,73 m/s` (lượt 3;
  lượt 2: 13,50 m/s).
- **Chống xuyên tường ở tốc độ cao:** mỗi frame chia quãng đường thành
  bước nhỏ ≤ 0,25 m, mỗi bước kiểm tra `resolveBikeCollisions` (dùng
  đúng hàm va chạm hiện có + mở rộng: vòng tròn thân cây r 0,3 m quanh
  `TREE_TRUNKS` + vòng tròn NPC Minh r 0,5 m — người đi bộ KHÔNG đổi
  hành vi, cây vẫn không có collider cho người đi bộ theo quyết định
  giai đoạn 3). Va chạm → mất 75% vận tốc, dừng/trượt nhẹ, không mô
  phỏng tai nạn; đếm va chạm vào `playerState.collisions` như đi bộ.
- **Camera khi lái:** bám sau xe, dist ≥ 7,5 m, target y 1,4 m, thấy
  đường trước; không rung (camera theo `useFrame` như cũ, chỉ đổi
  khoảng cách/target).
- **HUD:** chip tốc độ `🛵 x.x m/s · tối đa 14` khi đang lái; hướng dẫn
  phím trong hộp "Cách di chuyển" (`W ga · S phanh · A/D lái · E xuống xe`).
- **Mobile:** cụm lái chỉ hiện khi đang lái **và** trên thiết bị cảm
  ứng (`pointer:coarse`, như joystick): 4 nút 64×64 px — GA / PHANH /
  ◀ / ▶, giữ để chạy. Đặt góc dưới-phải, trên cụm nút (`bottom 13rem`)
  để không đè nút "?" (bottom 10rem) và không chạm joystick góc
  dưới-trái. Kiểm chứng 390 px: 4 nút 64×64, không chồng nút Tương tác
  hay joystick, không tràn ngang (`scrollW = innerW = 390`); giữ GA →
  v = 3,30 m/s; giữ PHANH → v = 0,55 m/s.

## 5. Phạm vi + chặn cửa phòng học

- Xe đi trên đường + sân; không xuyên nhà/xuống hồ/lên cầu thang
  (cùng `resolveCollisions`: nhà, bờ kè, hồ chữ nhật, biên campus).
- **Cửa phòng học:** bậc tam cấp C1 + bệ I LOVE BK chặn vật lý (xe dừng
  ở z = −41,35, trước bệ); vành đai nhắc 5 m quanh cửa (`CLASSROOM_DOOR`)
  hiện toast *"Xe không vào được phòng học — bấm E để xuống xe rồi vào
  lớp nhé."* (nhắc lại tối đa 1 lần/8 s). Vành đai phải là 5 m vì bệ
  I LOVE BK chặn xe ở 4,15 m — bán kính 3,2 m ban đầu không bao giờ tới
  được (phát hiện khi viết test, đã sửa).
- Va chạm đo thật (đều dừng đúng mặt vật cản + bán kính xe 0,55 m):
  mặt nam C9 z = 4,55; bờ kè đông hồ x = 21,65; thân cây đường tình yêu
  (28, −19,5) z = −18,65.

## 6. Chuỗi khung hình có vị trí/tốc độ + log kiểm thử

Chuỗi lái lượt 3 (`test-shots/ride-check.json`, 99 khung hình
`frames[]`, t = giây đồng hồ — SwiftShader chỉ ~1–2 fps nên thời gian
mô phỏng chậm hơn thời gian thực, xem ghi chú dưới):

| Khung | Vị trí (x, z) | v (m/s) | heading | Ghi chú |
|---|---|---|---|---|
| mount | (-70,00, 14,50) | 0,00 | 1,57 | lên xe ở điểm đỗ |
| ga | (-69,95, 14,50) | 0,60 | 1,57 | bắt đầu tăng tốc |
| ga | (-69,63, 14,50) | 1,97 | 1,57 | tăng tốc mượt |
| ga (cuối) | (-66,74, 14,50) | 6,11 | 1,57 | v > 6 m/s |
| rẽ trái | … | ~10,37 (max khung) | 1,57 → 1,75 | Δheading = +0,16 rad, lean = −0,08 |
| phanh | (-56,33, 13,08) | 0,29 | 1,88 | dừng hẳn, xuống xe cách xe 1,20 m |

Ảnh: `r3-bike-parked.png` (xe đỗ cạnh cổng Parabol), `r3-bike-mounted.png`
(ngồi trên yên, camera sau xe), `r3-bike-riding.png` (đang lái 6,2 m/s),
`r3-bike-side.png` (nghiêng: tay lên tay lái, gối gập, chân đặt sàn xe,
balô sau lưng), `r3-bike-front34.png` (3/4 trước), `r3-bike-mobile.png`
(390 px đang lái). Ảnh nghiêng xác nhận bằng mắt: tay tới đúng tay nắm,
chân không treo lơ lửng, balô không xuyên yên.

## 7. Kết quả test

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Type-check | `npx tsc --noEmit` | **PASS, exit 0** |
| Build | `npm run build` | **PASS**, `out/` static, First Load JS 234 kB |
| Test engine | `node --test test/learn.test.cjs` | **PASS 45/45** |
| Leg-sim đi bộ | `node test/leg-sim.cjs` | **PASS 4/4** |
| Test xe | `node test/ride-check.cjs` (server riêng :8339) | **PASS 22/22, 0 lỗi console/page, exit 0** |
| Hồi quy Bước 4–5 | `node test/verify-step4fix.cjs` (server riêng :8326) | **PASS 24/24, 0 lỗi console/page, exit 0** (lượt chạy 3; xem mục 8) |

`test/ride-check.cjs` — 22 bước (lượt chạy 3, ~10 phút): park,
prompt-single, mount, seated-pose, accelerate, steer-left, brake,
dismount, dismount-blocked-moving, call-3x, max-speed, collide-c9,
collide-lake, dismount-tight, collide-tree, recall-to-road,
classroom-door-block, mobile-call-btn, mobile-mount, mobile-drive-pad,
mobile-gas, mobile-brake. Log đầy đủ: `test-shots/ride-check.json`.

## 8. Lỗi còn tồn / chưa xác minh được

1. **`verify-step4fix` — ĐÃ ĐẠT 24/24 ở lượt chạy 3** (sau 2 lượt lỗi
   flaky, đã xác minh gốc rễ — không phải do code xe):
   - Lượt 1: B-fix 16/16 PASS, 0 lỗi console/page — rồi FATAL ở C-fix
     (nút `quest-close-panel` 30 s không "visible/stable",
     `verify-step4fix.cjs:404`). Cùng thao tác đó PASS ở B-fix ngay
     trước đó và PASS lại ở lượt 2–3 → flaky do SwiftShader chậm, không
     liên quan đường code xe (panel học, không chạm tới bike/poll xe).
   - Lượt 2: 22/24 — C-fix/E-fix PASS hết; 2 FAIL ở B-fix (f2c: tab
     "Cần ôn" hiện 6 thay vì 2; f9: panel kết quả cao thêm 40 px nên
     nút tràn). Gốc rễ đã chứng minh bằng dữ liệu: lượt 2 chạy **vắt
     qua nửa đêm ICT** (17:00 UTC = 00:00 ngày 07/11); `todayKey()`
     dùng Asia/Ho_Chi_Minh nên lúc mở sổ tay "hôm nay" đã là 07/11,
     trong khi các từ trả lời ngày 06/11 có `nextDue` 07/11 → 5 từ
     (ba, bian, qingchu, renzhen, shuxue) thành đến hạn + heiban (sai
     trong phiên) = 6 (khớp đúng export `/tmp/bkhn-fix-export.json`).
     Đây là lỗi nhạy ngày giờ có sẵn của test hồi quy, không phải do
     code xe (không chạm `lib/learn/*` hay logic ngày).
   - Lượt 3 (bắt đầu 00:07 ICT 07/11, hoàn toàn trong một ngày ICT):
     **24/24 PASS, 0 lỗi console/page, exit 0** — f2c = (2), f9 PASS.
     Khuyến nghị cho lần chạy sau: không chạy `verify-step4fix` vắt
     qua 17:00 UTC (00:00 ICT).
2. **Hai PASS giả đã bắt được và sửa trong lúc làm test (ghi lại để
   khỏi tái phạm):** (a) va chạm C9 lượt 1 PASS với `minZ = 11,98` —
   xe chưa tới tường vì vòng lặp dừng sớm khi tốc độ còn 0,3 m/s; đã
   sửa thành chỉ dừng khi đã từng chạy > 3 m/s rồi mới chậm lại
   (lượt 2–3 dừng đúng 4,55). (b) Nhắc cửa lớp: test đọc toast sau khi
   lái xong thì toast 2,5 s đã tắt; đã sửa thành bắt toast ngay trong
   lúc lái. (c) Đoạn test cây lượt 1 timeout vì quên gọi xe tới chỗ
   người chơi sau khi teleport — lỗi test, đã sửa.
3. **Chưa xác minh:** cảm giác lái / độ rung camera / thao tác GA-PHANH
   trên **điện thoại thật** (mới chỉ là emulation 390 px + pointer
   event tổng hợp); FPS khi lái ở tốc độ tối đa trên máy thật; bánh
   trước đổi hướng có nhìn rõ khi đang rẽ ở tốc độ cao không (mới đo
   bằng số `steer`/`lean`, chưa soi ảnh lúc đang rẽ gấp); xe có kẹt
   giữa 2 vật cản khi "Đưa xe về đường" gọi ở chỗ quá chật không
   (`findFreeSpotNear` trả null → toast, chưa gặp trường hợp này trong
   test); lùi xe (S khi gần dừng) mới kiểm tra bằng code, chưa có bước
   test riêng đo lùi đúng ≤ 2 m/s.
4. **Lưu ý nhỏ:** cụm lái mobile hiện theo `pointer:coarse` — máy tính
   có màn hình cảm ứng sẽ thấy cụm lái (chấp nhận được, bấm chuột giữ
   vẫn lái được); toast nhắc cửa lớp chỉ hiện 2,5 s/lần, tối đa 1 lần/8 s
   — đang lái nhanh có thể lướt qua không đọc kịp (prompt "Xuống xe"
   vẫn hiện liên tục nên không mất thông tin).

## 9. File thay đổi

- Mới: `components/three/Motorbike.tsx`, `test/ride-check.cjs`,
  `test/r3-bike-side-shots.cjs` (script chụp nghiêng, không phải test
  hồi quy), `docs/round3-phase4-report.md` (file này).
- Sửa: `components/three/Player.tsx` (trạng thái lái/tư thế ngồi/camera
  khi lái + hook `getBike/mountBike/dismountBike/callBike/recallBike/
  setBikePose`; KHÔNG đổi dấu khớp/pha đi bộ), `lib/playerState.ts`
  (thêm `bikeState` + `bikeInput`), `lib/campus.ts` (chỉ thêm
  `BIKE_PARK` / `BIKE_MAX_SPEED` / `BIKE_RADIUS` / `TREE_TRUNKS` /
  `NPC_CIRCLES` / `resolveBikeCollisions` / `nearestRoadPoint` /
  `findFreeSpotNear`), `app/page.tsx` (nút Gọi xe/Đưa xe về đường, chip
  tốc độ, cụm lái mobile, ưu tiên prompt E, hướng dẫn phím),
  `components/three/CampusScene.tsx` (gắn `<Motorbike/>` ngoài sân).
- Không sửa: `StudentAvatar`, `Npc`, `LibraryBuilding`, `Trees`,
  `TienLake`, `lib/learn/*`, `PROGRESS.md`, `NEXT_STEPS.md`.
